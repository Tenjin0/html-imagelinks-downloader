'use strict';

var https = require('https');
var path = require('path');
var url = require('url');
var fsExtra = require('fs-extra');
var StackFrame = require('stack-trace');

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

const regImageLinkHttpsOnly = /<img.*src="(((https:\/)?\/[.:\\/\w]+)*\/([-.#!:?+=&%@!\w]+[.](png|tiff|jpg|jpeg))[\\/?&=\w]*)"[^<]*\/?>/g;
const regimageLink = /<img.*src="(((https?:\/)?\/[.:\\/\w]+)*\/([-.#!:?+=&%@!\w]+[.](png|tiff|jpg|jpeg))[\\/?&=\w]*)".*[^<]\/?>/g;
function _unlinkOnlyFile(file, callback) {
    fsExtra.stat(file, (err, stats) => {
        if (err || !stats.isFile()) {
            callback(null);
        }
        else {
            fsExtra.unlink(file, callback);
        }
    });
}
class HttpsLinksConverter {
    constructor(folder) {
        if (!folder) {
            var stackPath = StackFrame.get()[1].getFileName();
            this.folder = path.dirname(stackPath);
        }
        if (!path.isAbsolute(folder)) {
            this._relativeFolder = folder;
            var stackPath = StackFrame.get()[1].getFileName();
            folder = path.join(path.dirname(stackPath), folder);
        }
        this.folder = folder;
        this.filepaths = [];
        this.newhtml = "";
        this.httpsOnly = true;
    }
    checkIfFolderIsCreate() {
        return new Promise((resolve, reject) => {
            fsExtra.stat(this.folder, (err, stats) => {
                if (err && err.code === "ENOENT") {
                    this._folderCreated = true;
                    fsExtra.mkdirp(this.folder).then(() => {
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
                const regex = this.httpsOnly ?
                    regImageLinkHttpsOnly :
                    regimageLink;
                let result = null;
                while (null !== (result = regex.exec(html))) {
                    httpsCount++;
                    let httpsUrl = result[1];
                    if (httpsUrl[0] === "/") {
                        httpsUrl = opts && opts.urlOrigin ? opts.urlOrigin + httpsUrl : "https://localhost";
                    }
                    const filename = result[4];
                    const filepath = path.join(this.folder, filename);
                    const file = fsExtra.createWriteStream(filepath);
                    const myURL = url.parse(httpsUrl);
                    const options = this._generateOptionsToRequest(myURL);
                    https.get(options, response => {
                        if (response.statusCode === 200) {
                            response.pipe(file);
                            file.on("finish", () => {
                                httpsCount--;
                                file.close(cb);
                            });
                        }
                        else {
                            file.close();
                            _unlinkOnlyFile(filepath, (err) => {
                                httpsCount--;
                                return reject(new Error(filename + ": " + response.statusCode + " " + response.statusMessage));
                            });
                        }
                    }).on("error", err => {
                        file.close();
                        _unlinkOnlyFile(filepath, () => {
                            httpsCount--;
                            return reject(err);
                        });
                    });
                    httpsUrl = httpsUrl.replace(/\\\\/g, "\\");
                    this.newhtml = this.newhtml.replace(result[1], "file:///" + filepath);
                    this.filepaths.push(filename);
                }
                if (0 === httpsCount) {
                    return resolve([this.newhtml, this.filepaths]);
                }
            });
        });
    }
    convertToBase64(html, opts) {
        return new Promise((resolve, reject) => {
            const cb = () => {
                if (0 === httpsCount) {
                    return resolve([this.newhtml, this.filepaths]);
                }
            };
            const filepaths = [];
            let httpsCount = 0;
            this.newhtml = html;
            const regex = this.httpsOnly ?
                regImageLinkHttpsOnly :
                regimageLink;
            let result = null;
            while (null !== (result = regex.exec(html))) {
                httpsCount++;
                let httpsUrl = result[1];
                if (httpsUrl[0] === "/") {
                    httpsUrl = opts && opts.urlOrigin ? opts.urlOrigin + httpsUrl : "https://localhost";
                }
                const filename = result[3];
                this._requestToBase64(httpsUrl).then((urlBase64) => {
                    this.newhtml = this.newhtml.replace(httpsUrl, urlBase64);
                    cb();
                }).catch((err) => {
                    reject(err);
                });
                filepaths.push(filename);
            }
            if (0 === httpsCount) {
                resolve([this.newhtml, filepaths]);
            }
        });
    }
    _generateOptionsToRequest(myUrl) {
        return {
            host: myUrl.hostname,
            port: myUrl.port,
            path: myUrl.pathname,
            rejectUnauthorized: false,
        };
    }
    _requestToBase64(httpsUrl) {
        let imageBase64 = "data:";
        const myURL = url.parse(httpsUrl);
        return new Promise((resolve, reject) => {
            const options = this._generateOptionsToRequest(myURL);
            https.get(options, response => {
                response.setEncoding("base64");
                imageBase64 = response.headers['content-type'] + ";base64,";
                response
                    .on("data", d => {
                    imageBase64 += d;
                }).on("end", () => {
                    resolve(imageBase64);
                });
            }).on("error", err => {
                reject(err);
            });
        });
    }
    /**
     * Remove all files in folder
     * @param deleteFolder if true delete the folder containing temp files
     */
    reset(deleteFolder = false) {
        return new Promise((resolve, reject) => {
            let count = 0;
            if (this.filepaths.length > 0) {
                for (let i = 0; i < this.filepaths.length; i++) {
                    _unlinkOnlyFile(path.join(this.folder, this.filepaths[i]), (err) => {
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
        }).then(() => {
            if (deleteFolder && this._folderCreated) {
                return fsExtra.rmdir(this.folder);
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

module.exports = HttpsLinksConverter;
