import { get } from 'https';
import { join, isAbsolute, dirname } from 'path';
import { parse } from 'url';
import { mkdirp, stat, createWriteStream, unlink, rmdir } from 'fs-extra';
import { get as get$1 } from 'stack-trace';

/*! *****************************************************************************
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the Apache License, Version 2.0 (the "License"); you may not use
this file except in compliance with the License. You may obtain a copy of the
License at http://www.apache.org/licenses/LICENSE-2.0

THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
MERCHANTABLITY OR NON-INFRINGEMENT.

See the Apache Version 2.0 License for specific language governing permissions
and limitations under the License.
***************************************************************************** */

function __awaiter(thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
}

global.Promise = require("bluebird");
class HttpsLinksConverter {
    constructor(folder) {
        if (!folder) {
            var stackPath = get$1()[1].getFileName();
            this.folder = dirname(stackPath);
        }
        if (!isAbsolute(folder)) {
            this._relativeFolder = folder;
            var stackPath = get$1()[1].getFileName();
            folder = join(dirname(stackPath), folder);
        }
        this.folder = folder;
        this.filepaths = [];
        this.newhtml = "";
        this.httpsOnly = true;
    }
    checkIfFolderIsCreate() {
        return new Promise((resolve, reject) => {
            stat(this.folder, (err, stats) => {
                if (err && err.code === "ENOENT") {
                    this._folderCreated = true;
                    mkdirp(this.folder).then(() => {
                        return resolve();
                    }).catch((e) => {
                        return reject(e);
                    });
                }
                else if (err) {
                    return reject(err);
                }
                else {
                    return resolve();
                }
            });
        });
    }
    /**
     * Compare 2 arrays and return data not found in the second
     * @param {String} html : html
     * @param {iOptions} opts : options
     * @returns {Promise} : array  [0]: html,  [1]: imagesfiles[]
     */
    convert(html, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            if (opts && opts.httpsOnly !== undefined && opts.httpsOnly !== null) {
                this.httpsOnly = opts.httpsOnly;
            }
            try {
                yield this.checkIfFolderIsCreate();
            }
            catch (e) {
                return Promise.reject(e);
            }
            return new Promise((resolve, reject) => {
                const cb = () => {
                    if (0 === httpsCount) {
                        return resolve([this.newhtml, this.filepaths]);
                    }
                };
                let httpsCount = 0;
                this.newhtml = html;
                let regex = new RegExp(`<img[ ]+src=\"((http${this.httpsOnly ? "s" : ""}:\/\/[.:\\/\w]+)*\/([-.#!:?+=&%@!\w]+[.](png|tiff|jpg|jpeg))[\\/?&=\w]*)\"[^<]*\/>`, "gi");
                let result = null;
                while (null !== (result = regex.exec(html))) {
                    httpsCount++;
                    let httpsUrl = result[1];
                    if (httpsUrl[0] === "/") {
                        httpsUrl = opts && opts.urlOrigin ? opts.urlOrigin + httpsUrl : "https://localhost";
                    }
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
        });
    }
    reset(deleteFolder = false) {
        if (deleteFolder && this._folderCreated) {
            return new Promise((resolve, reject) => {
                rmdir(this.folder).then(() => {
                    resolve();
                }).catch((e) => {
                    reject(e);
                });
            });
        }
        else {
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
                    return resolve();
                }
            });
        }
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
