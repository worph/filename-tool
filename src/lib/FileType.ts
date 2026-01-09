import {FileTypeConfigurable} from "./tools/FileTypeConfigurable";
import {extensionMappings} from "./config/ExtentionsMapping";
import {mimeTypeMappings} from "./config/MimeTypeMapping";

export class FileType extends FileTypeConfigurable {

    constructor() {
        super(extensionMappings,mimeTypeMappings);
    }
}
