const { promisify } = require('util');
const execAsync = promisify(require('child_process').exec);
const { 
  parseJsonFile, 
  writeJsonFile, 
} = require('./utils');

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
    const changedServices = await parseJsonFile(changesFilename);        

    if (!changedServices.length) {
      console.log('no changed services!');
      return;
    }

    const generatedTemplate = await buildPipelineSteps(commit, changedServices);

    await writeJsonFile(outputFilename, generatedTemplate);

    await uploadPipelineToBuildkite(outputFilename);

  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
}


async function readStepsForChangedServices(services) {
  // TODO: break this method down further
  const COMMON_PHASES = ['build', 'deploy-staging', 'deploy-prod'];

  const readServiceStepsForPhase = async (phase) => await Promise.all(
    services.map(service => parseJsonFile(`${service}/.buildkite/${phase}.json`))
  );

  const [build, deployStaging, deployProd] = await Promise.all(
    COMMON_PHASES.map(readServiceStepsForPhase).filter(Boolean)
  );

  const flattenSteps = (phase) => phase.reduce((acc, { steps = [] }) => acc.concat(steps), []);

  return { 
    build: flattenSteps(build),
    deployStaging: flattenSteps(deployStaging),
    deployProd: flattenSteps(deployProd),
   };
}


async function buildPipelineSteps(commit, services = []) {
  const DEFAULT_TEMPLATE = {env: {}, steps: []};

  const { build, deployStaging, deployProd } = await readStepsForChangedServices(services);

  if (!services.length) { return DEFAULT_TEMPLATE }

  const steps = build
    .concat(
      {
        type: "waiter"
      },
      deployStaging,
      {
        type: "waiter"
      },
      {
        "type": "script",
        "name": "e2e-staging :pray:",
        "command": "echo 'e2e'",
      },
      {
        block: "Release :red_button: :dragon:"
      },
        deployProd,
      {
        type: "waiter"
      },
      {
        "type": "script",
        "name": "e2e-prod :pray:",
        "command": "echo 'e2e'",
      }
    );

  return Object.assign(
    DEFAULT_TEMPLATE,
    { steps }, 
  );
}


function uploadPipelineToBuildkite(filePath) {
  return execAsync(`cat ${filePath} | buildkite-agent pipeline upload`);
}
