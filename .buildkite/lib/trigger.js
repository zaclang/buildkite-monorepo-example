const fs = require('fs');
const { promisify } = require('util');
const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);
const execAsync = promisify(require('child_process').exec);

const [
  CHANGES_LIST_FILENAME = 'changes.json',
  TEMPLATE_OUTPUT_FILENAME = 'dynamic-template.json',
] = process.argv.slice(2);

const {
  BUILDKITE_COMMIT,
} = process.env;

generateDynamicPipeline(BUILDKITE_COMMIT, CHANGES_LIST_FILENAME, TEMPLATE_OUTPUT_FILENAME);

async function generateDynamicPipeline(commit, changesFilename, outputFilename) {
  try {
    const changedServices = await parseFile(changesFilename);

    if (!changedServices.length) {
      console.log('no changed services!');
      return;
    }

    const generatedTemplate = await buildPipelineSteps(commit, changedServices);

    await writeFileAsync(outputFilename, JSON.stringify(generatedTemplate, null, 2));

    await uploadPipelineToBuildkite(outputFilename);

  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
}

async function readStepsForChangedServices(services) {
  // todo: refactor this!
  const build = await Promise.all(services.map(service => parseFile(`${service}/.buildkite/build.json`)));    
  const deployStaging = await Promise.all(services.map(service => parseFile(`${service}/.buildkite/deploy-staging.json`)));
  const deployProd = await Promise.all(services.map(service => parseFile(`${service}/.buildkite/deploy-prod.json`)));
  return { build, deployStaging, deployProd };
}

async function buildPipelineSteps(commit, services = []) {
  const DEFAULT_TEMPLATE = {env: {}, steps: []};

const { build, deployStaging, deployProd } = await readStepsForChangedServices(services);

  if (!services.length) { return DEFAULT_TEMPLATE };

  const steps = build.reduce((acc, item) => acc.concat(item.steps), [])
  
    // wait for builds to complete

    .concat([{ type: "waiter" }])
    .concat(deployStaging.reduce((acc, item) => acc.concat(item.steps), []))

    // wait for staging deployments to complete

    .concat([    
      { type: "waiter" },
      {
        "type": "script",
        "name": "e2e-staging :pray:",
        "command": "echo 'e2e'",
      },
      {
        block: "Release :red_button: :dragon:",
      }]
      .concat(deployProd.reduce((acc, item) => acc.concat(item.steps), []))

      // wait for prod deployments to complete

      .concat([
        {
          type: "waiter",
        },
        {
          "type": "script",
          "name": "e2e-prod :pray:",
          "command": "echo 'e2e'",
        }
      ])    
    );  

  return Object.assign(
    DEFAULT_TEMPLATE,
    { steps }, 
  );
}

async function parseFile(path) {
  try {
  const contents = await readFileAsync(path, { encoding: 'utf8' });   
  return JSON.parse(contents);
  } catch (error) {
    return '';
  }
}

function uploadPipelineToBuildkite(filePath) {
  return execAsync(`cat ${filePath} | buildkite-agent pipeline upload`);
}
