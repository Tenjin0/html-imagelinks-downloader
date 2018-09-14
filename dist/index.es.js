import { get } from 'https';
import { join, isAbsolute } from 'path';
import { parse } from 'url';
import { ensureDirSync, createWriteStream, unlink } from 'fs-extra';

global.Promise = require("bluebird");
class HttpsLinksConverter {
    constructor(folder) {
        if (!folder) {
            this.folder = process.cwd();
        }
        else {
            ensureDirSync(folder);
            if (!isAbsolute(folder)) {
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
    convert(html, httpsOnly) {
        if (httpsOnly !== undefined && httpsOnly !== null) {
            this.httpsOnly = httpsOnly;
        }
        return new Promise((resolve, reject) => {
            const cb = () => {
                if (0 === httpsCount) {
                    return resolve([this.newhtml, this.filepaths]);
                }
            };
            let httpsCount = 0;
            this.newhtml = html;
            const regex = this.httpsOnly ?
                /<img[ ]+src="((https:\/\/[.:\\/\w]+)*\/([-.\w]+[.](png|tiff|jpg|jpeg))[\\/?&=\w]*)"[^<]*\/>/g :
                /<img[ ]+src="((https?:\/\/[.:\\/\w]+)*\/([-.\w]+[.](png|tiff|jpg|jpeg))[\\/?&=\w]*)"[^<]*\/>/g;
            let result = null;
            while (null !== (result = regex.exec(html))) {
                httpsCount++;
                let httpsUrl = result[1];
                const filename = result[3];
                const filepath = join(this.folder, filename);
                const file = createWriteStream(filepath);
                const myURL = parse(httpsUrl);
                const options = {
                    // method: "GET",
                    host: myURL.host,
                    port: myURL.port,
                    path: myURL.pathname,
                    rejectUnauthorized: false,
                };
                get(options, response => {
                    response.pipe(file);
                    file.on("finish", () => {
                        httpsCount--;
                        file.close(cb);
                    });
                }).on("error", err => {
                    unlink(filename, () => {
                        httpsCount--;
                        return reject(err);
                    });
                });
                httpsUrl = httpsUrl.replace(/\\\\/g, "\\");
                this.newhtml = this.newhtml.replace(httpsUrl, "file:///" + filepath);
                this.filepaths.push(filename);
            }
            if (0 === httpsCount) {
                return resolve([this.newhtml, this.filepaths]);
            }
        });
    }
    convertToBase64(html, httpsOnly) {
        return new Promise((resolve, reject) => {
            resolve();
        });
    }
    reset() {
        return new Promise((resolve, reject) => {
            let count = 0;
            if (this.filepaths.length > 0) {
                for (let i = 0; i < this.filepaths.length; i++) {
                    unlink(join(this.folder, this.filepaths[i]), (err) => {
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
            }
            else {
                return Promise.resolve();
            }
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

export default HttpsLinksConverter;
