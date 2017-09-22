const fs = require('fs');
const { promisify } = require('util');
const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);
const execAsync = promisify(require('child_process').exec);

const [
  BASE_COMMIT = false,
  CHANGES_OUTPUT_FILENAME = 'changes.json',
] = process.argv.splice(2);

const {
  REGISTERED_SERVICES_CONFIG = '.buildkite/registered.json',
} = process.env;

detectAndOutputChanges(BASE_COMMIT, CHANGES_OUTPUT_FILENAME, REGISTERED_SERVICES_CONFIG);

async function detectAndOutputChanges(baseCommit, outputFilename, registeredServicesFilename) {
  try {
    if (!baseCommit) {
      throw new Error('Missing commit!')
    }

    await cleanUpTemporaryFiles(outputFilename);

    const registeredServices = await parseFile(registeredServicesFilename);

    const changedServices = await findDirectoriesChangedSinceCommit(baseCommit);

    const pipelinesToTrigger = changedServices.reduce((acc,service) =>
      registeredServices.includes(service)
        ? acc.push(service) && acc
        : acc
      , []);

    console.log({ pipelinesToTrigger });

    await writeFileAsync(outputFilename, JSON.stringify(pipelinesToTrigger, null, 2));

  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
}

async function findDirectoriesChangedSinceCommit(commit_sha) {
  console.log(`Detecting changes since commit: ${commit_sha}`);
  const { stdout, stderr } = await execAsync(`git diff --name-only ${commit_sha} | awk 'BEGIN {FS="/";} {print $1;}' | sort -u  `);
  if (stderr) {
    throw new Error(stderr);
  }  
  const changes = stdout.split('\n').filter(Boolean);
  console.log({ changes });
  return changes;
}

async function parseFile(filePath) {  
  const fileContents = await readFileAsync(filePath, { encoding: 'utf8' });
  return JSON.parse(fileContents);
}

function cleanUpTemporaryFiles(filePath) {
  return execAsync(`rm -f ${filePath}`);        
}
