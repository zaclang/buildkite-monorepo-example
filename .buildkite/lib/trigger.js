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
    const fileContents = await readFileAsync(changesFilename, {encoding: 'utf8'});
    const changedServices = JSON.parse(fileContents);

    if (!changedServices.length) {
      console.log('no changed services!');
      return;
    }

    const generatedTemplate = buildPipelineSteps(commit, changedServices);

    await writeFileAsync(outputFilename, JSON.stringify(generatedTemplate, null, 2));

    await uploadPipelineToBuildkite(outputFilename);

  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
}

function buildPipelineSteps(commit, services = []) {
  const DEFAULT_TEMPLATE = {env: {}, steps: []};

  const steps = services.map(service => ({
    trigger: service,
    name: `Building ${service} :node::docker:`,
    async: false,
    build: { commit }
  }));

  if (steps.length) {
    Array.prototype.push.apply(steps, [
      {
        type: "waiter",
      },
      {
        "type": "script",
        "name": "e2e-staging :pray:",
        "command": "echo 'e2e'",
      },
      {
        block: "Release :red_button: :dragon:",
      }]
      .concat(services.map(service => ({
        "type": "script",
        "name": `Deploying ${service}`,
        "command": `echo 'deploying ${service}'`,
      }))
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
    ));
  }

  return Object.assign(
    DEFAULT_TEMPLATE,
    { steps }   
  );
}

function uploadPipelineToBuildkite(filePath) {
  return execAsync(`cat ${filePath} | buildkite-agent pipeline upload`);
}
