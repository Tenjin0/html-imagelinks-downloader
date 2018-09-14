global.Promise  = require("bluebird");

import { get as getHttps, RequestOptions } from "https";
import { join, isAbsolute } from "path";
import * as url from "url";
import {ensureDirSync, createWriteStream, unlink} from "fs-extra"

export default class HttpsLinksConverter {

	private folder: string;
	private filepaths: string[];
	private newhtml: string;
	private httpsOnly: boolean;

	constructor(folder: string) {
		if (!folder) {
			this.folder = process.cwd();
		} else {

			ensureDirSync(folder)
			if(!isAbsolute(folder)) {
				folder = join(process.cwd(), folder);
			}
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
	convert(html: string, httpsOnly: boolean): Promise<[string, string[]]> {

		if (httpsOnly !== undefined && httpsOnly !== null) {
			this.httpsOnly = httpsOnly
		}
	
		return new Promise((resolve, reject) => {

			const cb: () => void = () => {
				if (0 === httpsCount) {
					return resolve([this.newhtml, this.filepaths]);
				}
			};

			let httpsCount: number = 0;
			this.newhtml = html;
			const regex: RegExp = this.httpsOnly ?
				/<img[ ]+src="((https:\/\/[.:\\/\w]+)*\/([-.\w]+[.](png|tiff|jpg|jpeg))[\\/?&=\w]*)"[^<]*\/>/g :
				/<img[ ]+src="((https?:\/\/[.:\\/\w]+)*\/([-.\w]+[.](png|tiff|jpg|jpeg))[\\/?&=\w]*)"[^<]*\/>/g;
			let result: RegExpExecArray = null;


			while (null !== (result = regex.exec(html))) {

				httpsCount++;
				let httpsUrl: string = result[1];
				const filename: string = result[3];

				const filepath: string = join(this.folder, filename);
				const file: any = createWriteStream(filepath);


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
							httpsCount--;
							file.close(cb);
						});
					}
				).on("error", err => {
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
				return resolve([this.newhtml, this.filepaths]);
			}
		})
	}

	convertToBase64(html: string, httpsOnly: boolean): Promise<[string, string[]]> {

		return new Promise((resolve, reject) => {
			resolve();
		});
	}

	reset(): Promise<void> {

		return new Promise((resolve, reject) => {
			let count: number = 0;
			if (this.filepaths.length > 0) {
				for (let i: number = 0; i < this.filepaths.length; i++) {
					unlink(join(this.folder, this.filepaths[i]), (err: Error) => {
						if (err) {
							return reject(err);
						}
						count++;
						if (this.filepaths.length === count) {
							this.filepaths = [];
							this.newhtml = "";
							return resolve();
						}
					});
				}
			} else {
				return Promise.resolve();
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
