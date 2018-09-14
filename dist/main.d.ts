export default class HttpsLinksConverter {
    private folder;
    private filepaths;
    private newhtml;
    private httpsOnly;
    private _folderCreated;
    private _relativeFolder;
    constructor(folder: string);
    private checkIfFolderIsCreate;
    /**
     * Compare 2 arrays and return data not found in the second
     * @param {String} html : html
     * @param {boolean} httpsOnly :only take https url
     * @returns {Promise} : array  [0]: html,  [1]: imagesfiles[]
     */
    convert(html: string, httpsOnly: boolean): Promise<any>;
    convertToBase64(html: string, httpsOnly: boolean): Promise<[string, string[]]>;
    reset(deleteFolder?: boolean): Promise<void>;
    getFiles(): String[];
    getFolder(): String;
    getHtml(): String;
}
