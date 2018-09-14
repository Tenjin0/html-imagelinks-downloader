export default class HttpsLinksConverter {
    private folder;
    private filepaths;
    private newhtml;
    private httpsOnly;
    constructor(folder: string);
    /**
     * Compare 2 arrays and return data not found in the second
     * @param {String} html : html
     * @param {boolean} httpsOnly :only take https url
     * @returns {Promise} : data not found in the second
     */
    convert(html: string, httpsOnly: boolean): Promise<[string, string[]]>;
    convertToBase64(html: string, httpsOnly: boolean): Promise<[string, string[]]>;
    reset(): Promise<void>;
    getFiles(): String[];
    getFolder(): String;
    getHtml(): String;
}
