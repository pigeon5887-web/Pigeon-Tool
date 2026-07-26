export namespace main {
	
	export class DirResult {
	    success: boolean;
	    path: string;
	    error?: string;
	
	    static createFrom(source: any = {}) {
	        return new DirResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.success = source["success"];
	        this.path = source["path"];
	        this.error = source["error"];
	    }
	}
	export class FileInfo {
	    success: boolean;
	    name: string;
	    path: string;
	    size: number;
	    error?: string;
	
	    static createFrom(source: any = {}) {
	        return new FileInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.success = source["success"];
	        this.name = source["name"];
	        this.path = source["path"];
	        this.size = source["size"];
	        this.error = source["error"];
	    }
	}
	export class MultipleFilesResult {
	    success: boolean;
	    files: FileInfo[];
	    path?: string;
	    error?: string;
	
	    static createFrom(source: any = {}) {
	        return new MultipleFilesResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.success = source["success"];
	        this.files = this.convertValues(source["files"], FileInfo);
	        this.path = source["path"];
	        this.error = source["error"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class TaskResult {
	    Success: boolean;
	    output?: string;
	    error?: string;
	
	    static createFrom(source: any = {}) {
	        return new TaskResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.Success = source["Success"];
	        this.output = source["output"];
	        this.error = source["error"];
	    }
	}

}

