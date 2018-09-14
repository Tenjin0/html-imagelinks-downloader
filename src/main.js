const getHTTPS = require("https").get;
const { join } = require("path");
const url = require("url");
const { createWriteStream, unlink } = require("fs");

module.exports = class HttpsLinksConverter {
	constructor(folder) {
		if (!folder) {
			this.folder = __dirname;
		} else {
			this.folder = folder;
		}
		console.log(this.folder);
		this.filepaths = [];
		this.newhtml = "";
		this.onlyHttps = true;
	}

	/**
	 * Compare 2 arrays and return data not found in the second
	 * @param {String} html : html
	 * @param {String} directory : path of the folder that will contains the images
	 * @returns {Promise} : data not found in the second
	 */
	convert(html) {
		return new Promise((resolve, reject) => {
			let result = null;
			this.newhtml = html;
			const httpsRegex = /<img[ ]+src="((https?:\/\/[.:\\/\w]+)*\/([-.\w]+[.](png|tiff|jpg|jpeg))[\\/?&=\w]*)"[^<]*\/>/g;
			let httpsCount = 0;

			while (null !== (result = httpsRegex.exec(html))) {
				httpsCount++;
				let httpsUrl = result[1];
				const filename = result[3];

				const filepath = join(this.folder, filename);
				const file = createWriteStream(filepath);

				const cb = () => {
					if (0 === httpsCount) {
						resolve([this.newhtml, this.filepaths]);
					}
				};

				const myURL = url.parse(httpsUrl);

				getHTTPS(
					{
						method: "GET",
						host: myURL.host,
						port: myURL.port,
						path: myURL.pathname,
						rejectUnauthorized: false,
						requestCert: false,
						agent: false
					},
					response => {
						response.pipe(file);
						file.on("finish", () => {
							httpsCount--;
							file.close(cb);
						});
					}
				).on("error", err => {
					// Handle errors

					unlink(filename, () => {
						httpsCount--;
						reject(err);
					});
				});

				httpsUrl = httpsUrl.replace(/\\\\/g, "\\");

				this.newhtml = this.newhtml.replace(
					httpsUrl,
					"file:///" + filepath
				);

				this.filepaths.push(filename);
			}

			if (0 === httpsCount) {
				resolve([this.newhtml, this.filepaths]);
			}
		});
	}

	reset() {
		return new Promise((resolve, reject) => {
			let count = 0;
			for (let i = 0; i < this.filepaths.length; i++) {
				unlink(join(this.folder, this.filepaths[i]), err => {
					if (err) {
						reject(err);
					}
					count++;
					if (this.filepaths.length === count) {
						resolve();
					}
				});
			}
		});
	}
};
