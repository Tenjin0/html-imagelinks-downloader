global.Promise = require("bluebird");

import { get as getHttps, RequestOptions } from "https";
import { join, isAbsolute, dirname } from "path";
import * as url from "url";
import { mkdirp, stat, createWriteStream, unlink, rmdir } from "fs-extra"
import * as StackFrame from "stack-trace";


export interface iOptions {
	httpsOnly: boolean
	urlOrigin: string
}

export default class HttpsLinksConverter {

	private folder: string;
	private filepaths: string[];
	private newhtml: string;
	private httpsOnly: boolean;
	private _folderCreated: boolean;
	private _relativeFolder: string;

	constructor(folder: string) {

		if (!folder) {
			var stackPath = StackFrame.get()[1].getFileName();
			this.folder = dirname(stackPath);
		}
		if (!isAbsolute(folder)) {
			this._relativeFolder = folder
			var stackPath = StackFrame.get()[1].getFileName();
			folder = join(dirname(stackPath), folder);
		}
		this.folder = folder;
		this.filepaths = [];
		this.newhtml = "";
		this.httpsOnly = true;
	}

	private checkIfFolderIsCreate(): Promise<void> {

		return new Promise((resolve, reject) => {

			stat(this.folder, (err, stats) => {
				if (err && err.code === "ENOENT") {
					this._folderCreated = true;
					mkdirp(this.folder).then(() => {
						return resolve();
					}).catch((e) => {
						return reject(e);
					})
				} else if (err) {
					return reject(err)
				} else {
					return resolve()

				}
			})
		})
	}
	/**
	 * Compare 2 arrays and return data not found in the second
	 * @param {String} html : html
	 * @param {iOptions} opts : options
	 * @returns {Promise} : array  [0]: html,  [1]: imagesfiles[]
	 */
	async convert(html: string, opts: iOptions): Promise<any> {

		if (opts && opts.httpsOnly !== undefined && opts.httpsOnly !== null) {
			this.httpsOnly = opts.httpsOnly
		}

		try {
			await this.checkIfFolderIsCreate();
		} catch (e) {
			return Promise.reject(e);
		}

		return new Promise((resolve, reject) => {

			const cb: () => void = () => {
				if (0 === httpsCount) {
					return resolve([this.newhtml, this.filepaths]);
				}
			};

			let httpsCount: number = 0;
			this.newhtml = html;
			let regex = new RegExp(`<img[ ]+src=\"((http${this.httpsOnly ? "s" : ""}:\/\/[.:\\/\w]+)*\/([-.#!:?+=&%@!\w]+[.](png|tiff|jpg|jpeg))[\\/?&=\w]*)\"[^<]*\/>`, "gi");

			let result: RegExpExecArray = null;

			while (null !== (result = regex.exec(html))) {

				httpsCount++;
				let httpsUrl: string = result[1];

				if (httpsUrl[0] === "/") {
					httpsUrl = opts && opts.urlOrigin ? opts.urlOrigin + httpsUrl : "https://localhost"
				}

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

				getHttps(options, response => {
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
		});
	}

	reset(deleteFolder: boolean = false): Promise<void> {
		if (deleteFolder && this._folderCreated) {

			return new Promise((resolve, reject) => {
				rmdir(this.folder).then(() => {
					resolve();
				}).catch((e) => {
					reject(e);
				})
			});
		} else {
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
					return resolve();
				}
			});
		}
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
