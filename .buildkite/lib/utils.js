const fs = require('fs');
const { promisify } = require('util');
const writeFileAsync = promisify(fs.writeFile);
const readFileAsync = promisify(fs.readFile);

async function parseJsonFile(path) {
  try {
  const contents = await readFileAsync(path, { encoding: 'utf8' });   
  return JSON.parse(contents);
  } catch (error) {
		// console.error(error);
    return '';
  }
}

async function writeJsonFile(path, content) {
	await writeFileAsync(path, JSON.stringify(content, null, 2));
}

module.exports = { parseJsonFile, writeJsonFile };
