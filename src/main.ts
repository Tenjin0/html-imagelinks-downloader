import { get as getHttps, RequestOptions } from "https";
import { join } from "path";
import * as url from "url";

const { createWriteStream, unlink } = require("fs");

export default class HttpsLinksConverter {

	private folder: string;
	private filepaths: string[];
	private newhtml: string;
	private onlyHttps: boolean;

	constructor(folder: string) {
		if (!folder) {
			this.folder = __dirname;
		} else {
			this.folder = folder;
		}
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
	convert(html: string, httpsOnly: boolean): Promise<[string, string[]]> {

		if (httpsOnly !== undefined || httpsOnly !== null)
			this.onlyHttps = httpsOnly
		return new Promise((resolve, reject) => {

			let result: RegExpExecArray = null;
			this.newhtml = html;
			const regex: RegExp = this.onlyHttps ?
				/<img[ ]+src="((https:\/\/[.:\\/\w]+)*\/([-.\w]+[.](png|tiff|jpg|jpeg))[\\/?&=\w]*)"[^<]*\/>/g :
				/<img[ ]+src="((http:\/\/[.:\\/\w]+)*\/([-.\w]+[.](png|tiff|jpg|jpeg))[\\/?&=\w]*)"[^<]*\/>/g;
			let httpsCount: number = 0;

			while (null !== (result = regex.exec(html))) {

				httpsCount++;
				let httpsUrl: string = result[1];
				const filename: string = result[3];

				const filepath: string = join(this.folder, filename);
				const file: any = createWriteStream(filepath);

				const cb: () => void = () => {
					if (0 === httpsCount) {
						resolve([this.newhtml, this.filepaths]);
					}
				};

				const myURL: url.UrlWithStringQuery = url.parse(httpsUrl);
				const options: RequestOptions = {
					// method: "GET",
					host: myURL.host,
					port: myURL.port,
					path: myURL.pathname,
					rejectUnauthorized: false,
					// requestCert: false,
					// agent: false
				};

				getHttps(options
					,
					response => {
						response.pipe(file);
						file.on("finish", () => {
							console.log("finish");
							httpsCount--;
							file.close(cb);
						}).on("close", () => {
							console.log("close");
						});
					}
				).on("error", err => {

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


	reset(): Promise<void> {

		return new Promise((resolve, reject) => {

			let count: number = 0;
			for (let i: number = 0; i < this.filepaths.length; i++) {
				unlink(join(this.folder, this.filepaths[i]), (err: Error) => {
					if (err) {
						return reject(err);
					}
					count++;
					if (this.filepaths.length === count) {
						return resolve();
					}
				});
			}
		});
	}

	getFiles(): String[] {
		return this.filepaths;
	}

	getFolder(): String {
		return this.folder;
	}

	getHtml(): String {
		return this.newhtml;
	}
}
