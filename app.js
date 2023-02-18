const { createWorker } = require('tesseract.js');
const fs = require('fs');
const path = require('path');
const docx = require('docx');

const { Document, Packer, Paragraph, TextRun } = docx;
const dataDir = path.join(__dirname, '_data');

const passes = [];
const fails = [];

const recognize = async (image, langs) => {
  const worker = await createWorker();
  await worker.loadLanguage(langs);
  await worker.initialize(langs);
  return worker.recognize(image)
    .finally(async () => {
      await worker.terminate();
    });
};

(async () => {
	const files = await fs.promises.readdir(dataDir);
	const total = files.length;
	let count = 0;

	console.log(`${total} files ready for processing... ⏳`);

	while (count <= (total - 1)) {
		try {
			const { data: { text } } = await recognize(path.join(__dirname, '_data', files[count]), 'eng');

			let newLine = '';
			text.split().forEach(lines => {
				let ln = lines.split('\n').filter(ch => ch !== '');
			
				ln.forEach(line => {
					line.endsWith('-') ?  newLine += line : newLine += `${line} `;
				});
			});

			console.log(`${files[count]} - ${(count + 1)}/${total} -----------------------\n`, newLine, '\n\n');

			const doc = new Document({
				sections: [{
					properties: {},
					children: [
						new Paragraph({
							children: [new TextRun(newLine)],
						}),
					],
				}],
			});
		
			const docxBuffer = await Packer.toBuffer(doc);
			fs.writeFileSync(path.join(__dirname, '_results', `${files[count]}.docx`), docxBuffer);
	
			passes.push({ file: files[count], pass: newLine !== '', data: newLine });
		} catch (error) {
			fails.push({ file: files[count], pass: false, error });
			continue;
		}

		count++;
	}

	fs.writeFileSync('./_results/test-pass.json', JSON.stringify(passes, null, 2));
	fs.writeFileSync('./_results/test-fail.json', JSON.stringify(fails, null, 2));

	console.log('🎉 conversations complete!');
})();
