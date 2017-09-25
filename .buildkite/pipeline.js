const generatePipeline = () => {
  return {
    env: {},
    steps: [
      {
        "type": "script",
        "name": `:eyes: :microscope: :github: Detecting changes`,
        "command": `node .buildkite/lib/detect-changes.js $(git rev-parse --verify HEAD~1)`,
        "artifact_paths": "changes.json"
      },
      {
        type: "waiter",
      },
      {
        "type": "script",
        "name": ":boom::gun: Triggering changes",
        "command": "node .buildkite/lib/trigger.js",
        "artifact_paths": "dynamic-template.json"
      },
    ]
  };
};

console.log(JSON.stringify(generatePipeline(), null, 2));
