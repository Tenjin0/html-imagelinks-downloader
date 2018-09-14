export default class HttpsLinksConverter {
    private folder;
    private filepaths;
    private newhtml;
    private onlyHttps;
    constructor(folder: string);
    /**
     * Compare 2 arrays and return data not found in the second
     * @param {String} html : html
     * @param {String} directory : path of the folder that will contains the images
     * @returns {Promise} : data not found in the second
     */
    convert(html: string, httpsOnly: boolean): Promise<[string, string[]]>;
    reset(): Promise<void>;
    getFiles(): String[];
    getFolder(): String;
    getHtml(): String;
}
