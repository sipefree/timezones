/**
 *
 * Based on a tool from Pavel Gurenko: http://www.pavelgurenko.com/2017/05/getting-posix-tz-strings-from-olson.html
 *
 **/
load('api_config.js');

let TZINFO = {

	_dataPath: Cfg.get('timezone.data_path'),
	_dataGroups: ["Africa", "America", "Asia", "Europe", "Others"],
	_dataFiles: {
		Africa: 'africa-tz.min.json',
		America: 'america-tz.min.json',
		Asia: 'asia-tz.min.json',
		Europe: 'europe-tz.min.json',
		Others: 'others-tz.min.json'
	},
	
	getFileName: function(path, name) {
		if (path.length === 0) {
			return name;			
		} else {
			return path + '/' + name;
		}
	},
	
	moveData: function(target, doForce) {
		let result = false;

		if (target !== this._dataPath) {
			let copied = [];
			if (target && target.length > 0) {
				for (let i = 0; i < this._dataGroups.length; i++) {
					let group = this._dataGroups[i];
					let tgtFile = this.moveFile(this._dataFiles[group], target);
					result = (tgtFile.length > 0);
					if (result) {
						copied.push(tgtFile);
					}
				}
			}
		
			if (result) {
				// if all went well, we remove the source files
				for (let i = 0; i < this._dataGroups.length; i++) {
					let group = this._dataGroups[i];
					let file = this.getFileName(this._dataPath, this._dataFiles[group]);
					result = (File.remove(file) === 0);
				}
			} else {
				// on error we remove already copied files
				for (let i = 0; i < copied.length; i++) {
					let file = copied[i];
					(File.remove(file) === 0);
				}
			}
			this._dataPath = result ? target : this._dataPath; 

			let oSet = { timezone: { data_path: this._dataPath } };
			Cfg.set(oSet);
		} else {
			// already moved ...
			result = true;
		}
		
		return result;
	},

	moveFile: function(srcName, target) {
		let result = '';
		if (target && target.length > 0) {
			let srcFile = this.getFileName(this._dataPath, srcName);
			let tgtFile = this.getFileName(target, srcName); 
			let strJSON = File.read(srcFile);
			if (strJSON && strJSON.length > 0) {
				let len = 0;
				len = File.write(strJSON, tgtFile);
				if (len === strJSON.length) {
					result = tgtFile;
				}
			}
		}
		return result;
	},
	
	loadData: function(group) {
		let file = this.getFileName(this._dataPath, this._dataFiles[group]); 
		let strJSON = File.read(file);
		let oJSON = {};
		Log.debug(logHead + 'Timezone JSON file read!');
		if (strJSON !== null && strJSON.length > 0) {
			oJSON = JSON.parse(strJSON);
			Log.debug(logHead + 'JSON Status data read successfully!');
		}
		return oJSON;
	},

	convertOlsonToPosix: function (name, doConf, doForce) {
		let parts = TOOLS.splitString(name, '/');
		let group = 'Others';
		if (parts.length > 0) {
			if (this._dataFiles[parts[0]]) {
				group = parts[0];
			}
		}
		
		let tzData = this.loadData(group);
		if (tzData) {
			let tzSpec = tzData[name];
			tzData = null;
			if (doConf) {
				this.setTimeZoneInConf(tzSpec);
			}
			gc(true);
			Log.info('Timezone settings for <' + name + '>: ' + tzSpec);
			return tzSpec;
		} else {
			Log.error('Timezone: ' + name + ' not found in database!');
			return 'UTC0';
		}
	},
	
	setTimeZoneInConf: function(tzSpecStr) {
		let oSet = { sys: { tz_spec: tzSpecStr } };
		Cfg.set(oSet);
	}

}