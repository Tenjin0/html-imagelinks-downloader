import { get as getHttps, RequestOptions } from "https";
import { join, isAbsolute, dirname } from "path";
import * as url from "url";
import { mkdirp, stat, createWriteStream, unlink, rmdir } from "fs-extra"
import * as StackFrame from "stack-trace";


export interface iOptions {
	httpsOnly: boolean
	urlOrigin: string
}


const regImageLinkHttpsOnly = /<img.*src="(((https:\/)?\/[.:\\/\w]+)*\/([-.#!:?+=&%@!\w]+[.](png|tiff|jpg|jpeg|gif))[\\/?&=\w]*)"[^<]*\/?>/g
const regimageLink = /<img.*src="(((https?:\/)?\/[.:\\/\w]+)*\/([-.#!:?+=&%@!\w]+[.](png|tiff|jpg|jpeg|gif))[\\/?&=\w]*)"[^<]*\/?>/g

function _unlinkOnlyFile (file: string, callback: (err: NodeJS.ErrnoException) => void) {

    stat(file, (err, stats) => {

        if (err || !stats.isFile()) {
            callback(null);
        }
        else {
            unlink(file, callback);
        }

    });

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
			const regex: RegExp = this.httpsOnly ?
				regImageLinkHttpsOnly :
				regimageLink
				;
			let result: RegExpExecArray = null;

			while (null !== (result = regex.exec(html))) {

				httpsCount++;
				let httpsUrl: string = result[1];
				if (httpsUrl[0] === "/") {
					httpsUrl = opts && opts.urlOrigin ? opts.urlOrigin + httpsUrl : "https://localhost"
				}

				const filename: string = result[4];
				const filepath: string = join(this.folder, filename);
				const file: any = createWriteStream(filepath);
				const myURL: url.UrlWithStringQuery = url.parse(httpsUrl);
				const options: RequestOptions = this._generateOptionsToRequest(myURL)

				getHttps(options, response => {

					if (response.statusCode === 200) {

						response.pipe(file);
						file.on("finish", () => {
	
							httpsCount--;
							file.close(cb);
						});
					} else {

						file.close()
						_unlinkOnlyFile(filepath, (err) => {

							httpsCount--;
							return reject(new Error(filename + ": " + response.statusCode + " " + response.statusMessage));
						});
					}
				}).on("error", err => {
					file.close()
					_unlinkOnlyFile(filepath, () => {
						httpsCount--;
						return reject(err);
					});
				});

				httpsUrl = httpsUrl.replace(/\\\\/g, "\\");
				this.newhtml = this.newhtml.replace(
					result[1],
					"file:///" + filepath
				);

				this.filepaths.push(filename);
			}
			if (0 === httpsCount) {
				return resolve([this.newhtml, this.filepaths]);
			}
		});
	}

	convertToBase64(html: string, opts: iOptions): Promise<[string, string[]]> {

		return new Promise((resolve, reject) => {

			const cb: () => void = () => {
				if (0 === httpsCount) {
					return resolve([this.newhtml, this.filepaths]);
				}
			};

			const filepaths = []
			let httpsCount: number = 0;
			this.newhtml = html;

			const regex: RegExp = this.httpsOnly ?
				regImageLinkHttpsOnly :
				regimageLink
				;

			let result: RegExpExecArray = null;

			while (null !== (result = regex.exec(html))) {
				httpsCount++;
				let httpsUrl: string = result[1];

				if (httpsUrl[0] === "/") {
					httpsUrl = opts && opts.urlOrigin ? opts.urlOrigin + httpsUrl : "https://localhost"
				}

				const filename: string = result[3];

				this._requestToBase64(httpsUrl).then((urlBase64) => {
					this.newhtml = this.newhtml.replace(
						httpsUrl, urlBase64);
					cb()

				}).catch((err) => {
					reject(err);
				})

				filepaths.push(filename);
			}
			if (0 === httpsCount) {
				resolve([this.newhtml, filepaths]);
			}
		});
	}

	_generateOptionsToRequest(myUrl: url.UrlWithStringQuery): RequestOptions {
		return {
			host: myUrl.hostname,
			port: myUrl.port,
			path: myUrl.pathname,
			rejectUnauthorized: false,
		}
	}
	_requestToBase64(httpsUrl: string): Promise<string> {

		let imageBase64: string = "data:";
		const myURL: url.UrlWithStringQuery = url.parse(httpsUrl);
		return new Promise((resolve, reject) => {

			const options: RequestOptions = this._generateOptionsToRequest(myURL)

			getHttps(options, response => {

				response.setEncoding("base64");
				imageBase64 = response.headers['content-type'] + ";base64,";
				response
					.on("data", d => {
						imageBase64 += d
					}).on("end", () => {
						resolve(imageBase64)
					});
			}).on("error", err => {
				reject(err)
			})
		})

	}

	/**
	 * Remove all files in folder
	 * @param deleteFolder if true delete the folder containing temp files
	 */
	reset(deleteFolder: boolean = false): Promise<void> {

		return new Promise((resolve, reject) => {

			let count: number = 0;
			if (this.filepaths.length > 0) {

				for (let i: number = 0; i < this.filepaths.length; i++) {

					_unlinkOnlyFile(join(this.folder, this.filepaths[i]), (err: Error) => {

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
		}).then(() => {
			if (deleteFolder && this._folderCreated) {
				return rmdir(this.folder)
			} else {
				return Promise.resolve();
			}
		})
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
