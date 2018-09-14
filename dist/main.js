'use strict';

var https = require('https');
var path = require('path');
var url = require('url');

const { createWriteStream, unlink } = require("fs");
class HttpsLinksConverter {
    constructor(folder) {
        if (!folder) {
            this.folder = __dirname;
        }
        else {
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
    convert(html, httpsOnly) {
        if (httpsOnly !== undefined || httpsOnly !== null)
            this.onlyHttps = httpsOnly;
        return new Promise((resolve, reject) => {
            let result = null;
            this.newhtml = html;
            const regex = this.onlyHttps ?
                /<img[ ]+src="((https:\/\/[.:\\/\w]+)*\/([-.\w]+[.](png|tiff|jpg|jpeg))[\\/?&=\w]*)"[^<]*\/>/g :
                /<img[ ]+src="((http:\/\/[.:\\/\w]+)*\/([-.\w]+[.](png|tiff|jpg|jpeg))[\\/?&=\w]*)"[^<]*\/>/g;
            let httpsCount = 0;
            while (null !== (result = regex.exec(html))) {
                httpsCount++;
                let httpsUrl = result[1];
                const filename = result[3];
                const filepath = path.join(this.folder, filename);
                const file = createWriteStream(filepath);
                const cb = () => {
                    if (0 === httpsCount) {
                        resolve([this.newhtml, this.filepaths]);
                    }
                };
                const myURL = url.parse(httpsUrl);
                const options = {
                    // method: "GET",
                    host: myURL.host,
                    port: myURL.port,
                    path: myURL.pathname,
                    rejectUnauthorized: false,
                };
                https.get(options, response => {
                    response.pipe(file);
                    file.on("finish", () => {
                        console.log("finish");
                        httpsCount--;
                        file.close(cb);
                    }).on("close", () => {
                        console.log("close");
                    });
                }).on("error", err => {
                    unlink(filename, () => {
                        httpsCount--;
                        reject(err);
                    });
                });
                httpsUrl = httpsUrl.replace(/\\\\/g, "\\");
                this.newhtml = this.newhtml.replace(httpsUrl, "file:///" + filepath);
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
                unlink(path.join(this.folder, this.filepaths[i]), (err) => {
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
