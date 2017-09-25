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
  // todo: refactor this!
  const build = await Promise.all(services.map(service => parseJsonFile(`${service}/.buildkite/build.json`)));    
  const deployStaging = await Promise.all(services.map(service => parseJsonFile(`${service}/.buildkite/deploy-staging.json`)));
  const deployProd = await Promise.all(services.map(service => parseJsonFile(`${service}/.buildkite/deploy-prod.json`)));

  return { 
    build: build.filter(Boolean), 
    deployStaging: deployStaging.filter(Boolean), 
    deployProd: deployProd.filter(Boolean)
   };
}

async function buildPipelineSteps(commit, services = []) {
  const DEFAULT_TEMPLATE = {env: {}, steps: []};

  const { build, deployStaging, deployProd } = await readStepsForChangedServices(services);

  if (!services.length) { return DEFAULT_TEMPLATE }

  const combineStepsForStage = (stage) => stage.reduce((acc, { steps = [] }) => acc.concat(steps), []);

  const steps = combineStepsForStage(build)
    .concat([{ type: "waiter" }])
    .concat(combineStepsForStage(deployStaging))
    .concat([{ type: "waiter" },
      {
        "type": "script",
        "name": "e2e-staging :pray:",
        "command": "echo 'e2e'",
      },
      { block: "Release :red_button: :dragon:" }]
    .concat(combineStepsForStage(deployProd))
    .concat([{ type: "waiter" },
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

function uploadPipelineToBuildkite(filePath) {
  return execAsync(`cat ${filePath} | buildkite-agent pipeline upload`);
}
