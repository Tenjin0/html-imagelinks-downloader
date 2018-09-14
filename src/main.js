"use strict";
global.Promise = require("bluebird");

var https = require("https");
var path = require("path");
var url = require("url");
var stackTrace = require("stack-trace");

const { createWriteStream, unlink } = require("fs");
class HttpsLinksConverter {
	constructor(folder) {
		const trace = stackTrace.get();
		console.log(path.dirname(trace[1].getFileName()));
		if (!folder) {
			this.folder = __dirname;
		} else {
			this.folder = folder;
		}
		this.filepaths = [];
		this.newhtml = "";
		this.httpsOnly = true;
	}

	/**
	 * Compare 2 arrays and return data not found in the second
	 * @param {String} html : html
	 * @param {boolean} httpsOnly :only take https url
	 * @returns {Promise} : data not found in the second
	 */
	convert(html, httpsOnly) {
		if (httpsOnly !== undefined && httpsOnly !== null) {
			this.httpsOnly = httpsOnly;
		}
		return new Promise((resolve, reject) => {
			const cb = () => {
				console.log(httpsCount);
				if (0 === httpsCount) {
					console.log("resolve");
					return resolve([this.newhtml, this.filepaths]);
				}
			};
			let httpsCount = 0;
			this.newhtml = html;
			const regex = this.httpsOnly
				? /<img[ ]+src="((https:\/\/[.:\\/\w]+)*\/([-.\w]+[.](png|tiff|jpg|jpeg))[\\/?&=\w]*)"[^<]*\/>/g
				: /<img[ ]+src="((https?:\/\/[.:\\/\w]+)*\/([-.\w]+[.](png|tiff|jpg|jpeg))[\\/?&=\w]*)"[^<]*\/>/g;
			let result = null;
			while (null !== (result = regex.exec(html))) {
				httpsCount++;
				let httpsUrl = result[1];
				const filename = result[3];
				const filepath = path.join(this.folder, filename);
				const file = createWriteStream(filepath);
				const myURL = url.parse(httpsUrl);
				const options = {
					// method: "GET",
					host: myURL.host,
					port: myURL.port,
					path: myURL.pathname,
					rejectUnauthorized: false
				};
				https
					.get(options, response => {
						response.pipe(file);
						file.on("finish", () => {
							console.log("close");
							httpsCount--;
							file.close(cb);
						});
					})
					.on("error", err => {
						console.log("error");
						unlink(filename, () => {
							httpsCount--;
							return reject(err);
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
				console.log("resolve");
				return resolve([this.newhtml, this.filepaths]);
			}
			console.log("end");
		});
	}

	convertToBase64(html, httpsOnly) {
		return new Promise((resolve, reject) => {
			resolve();
		});
	}
	reset() {
		return new Promise((resolve, reject) => {
			console.log("reset");
			let count = 0;
			if (this.filepaths.length > 0) {
				for (let i = 0; i < this.filepaths.length; i++) {
					unlink(path.join(this.folder, this.filepaths[i]), err => {
						if (err) {
							console.log("reject 2");
							return reject(err);
						}
						count++;
						if (this.filepaths.length === count) {
							this.filepaths = [];
							this.newhtml = "";
							console.log("resolve 2");
							return resolve();
						}
					});
				}
			} else {
				console.log("resolve 3");
				return Promise.resolve();
			}
			console.log("end 2");
		});
	}
	getFiles() {
		return this.filepaths;
	}
	getFolder() {
		return this.folder;
	}
	getHtml() {
		return this.newhtml;
	}
}

module.exports = HttpsLinksConverter;
