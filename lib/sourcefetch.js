'use babel';
/*global atom $*/

import { CompositeDisposable } from 'atom';
import request from 'request';
import cheerio from 'cheerio';
import google from 'google';

google.resultsPerPage = 1;

export default {

	subscriptions: null,

	activate() {
		// Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
		this.subscriptions = new CompositeDisposable();

		this.subscriptions.add(atom.commands.add('atom-workspace', {
			'sourcefetch:fetch': () => this.fetch()
		}));
	},

	deactivate() {
		this.subscriptions.dispose();
	},

	fetch() {
		let editor;

		if ((editor = atom.workspace.getActiveTextEditor())){
			let query = editor.getSelectedText();
			let language = editor.getGrammar().name;

			this.search(query, language).then((url) => {
				atom.notifications.addSuccess('Found google results!');
				return this.download(url);
			}).then((html) =>{
				let answer = this.scrape(html);
				if (answer === '') {
					atom.notifications.addWarning('No answer found :(');
				} else {
					atom.notifications.addSuccess('Found snippet!');
					editor.insertText(answer);
				}
			}).catch((error) => {
				console.warn(error);
				atom.notifications.addWarning(error.reason);
			});
		}
	},

	download(url) {
		return new Promise((resolve,reject) => {
			request(url, (error, response, body) => {
				if (!error && response.statusCode == 200) {
					resolve(body);
				} else {
					reject({
						reason: 'Unable to download page'
					});
				}
			});
		});
	},

	scrape(html) {
		$ = cheerio.load(html);
		return $('div.accepted-answer pre code').text();
	},

	search(query, language) {
		return new Promise((resolve,reject) => {
			let searchString = `${query} in ${language} site:stackoverflow.com`;

			google(searchString, (err, res) => {
				if (err) {
					reject({
						reason: 'A search error has occured :('
					});
				} else if (res.links.length === 0) {
					reject({
						reason: 'No results found :('
					});
				} else {
					resolve(res.links[0].href);
				}
			});
		});
	}

};
