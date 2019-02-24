import { EventEmitter } from 'events';
import React from 'react';
// import ReactDOM from 'react-dom';

class AuthService extends EventEmitter {
	constructor(){
		super();
		var self = this;
		this.session = {};

		this.getSession()
			.then(function(session){
				// self.session = session;
			})
			.catch(function(error){
				// Do nothing
				
			})
	}

	getSession(){
		return Promise.resolve({
			username: 'jks',
			first_name: 'Kumseok'
		});
		// var self = this;
		// return new Promise((resolve, reject)=>{
		// 	$.ajax({
		// 		url: window.location.origin+'/auth/info',
		// 		method: 'GET',
		// 	})
		// 	.done(function(response){
		// 		console.log('[AuthService] Got Session', response);
		// 		self.session = response;
		// 		resolve(response);
		// 	})
		// 	.fail(function(error){
		// 		console.log('[AuthService] Problem Getting Sessions', error);
		// 		reject({ code: error.status, message: error.responseText });
		// 		self.emit('logout');
		// 	})
		// })
	}

	updateInfo(data){
		var self = this;
		return new Promise(function(resolve, reject){
			$.ajax({
				url: window.location.origin+'/auth/info',
				method: 'POST',
				data: data
			})
			.done(function(response){
				console.log('[AuthService] Updated Session', response);
				self.session = response;
				resolve(response);
			})
			.fail(function(error){
				console.log('[AuthService] Problem Updating Sessions', error);
				reject({ code: error.status, message: error.responseText });
				self.emit('logout');
			})
		})
	}

	logout(){
		var self = this;
		this.session = {};
		return new Promise(function(resolve, reject){
			$.ajax({
				url: window.location.origin+'/auth/logout',
				method: 'GET',
			})
			.done(function(response){
				console.log('[AuthService] Logged out', response);
				resolve(response);
				self.emit('logout');
			})
			.fail(function(error){
				console.log('[AuthService] Problem Logging out', error);
				reject({ code: error.status, message: error.responseText });
				self.emit('logout');
			})
		})
	}
	
	login(login_form){
		var self = this;
		console.log('[AuthService] Trying to Login', login_form);
		return new Promise((resolve, reject)=>{
			$.ajax({
				url: window.location.origin+'/auth/login',
				method: 'POST',
				data: login_form
			})
			.done(function(response){
				console.log(response);
				self.session = response;
				resolve(response);
			})
			.fail(function(error){
				console.log('[AuthService] Problem Logging in', error);
				reject({ code: error.status, message: error.responseText });
			})
		})
	}

	signup(signup_form){
		console.log('[AuthService] Trying to Sign up', signup_form);
		return new Promise((resolve, reject)=>{
			$.ajax({
				url: window.location.origin+'/auth/signup',
				method: 'POST',
				data: signup_form
			})
			.done(function(response){
				console.log(response);
				resolve(response);
			})
			.fail(function(error){
				console.log('[AuthService] Problem signing up', error);
				reject({ code: error.status, message: error.responseText });
			})
		})
	}

	setPassword(password){
		var self = this;
		console.log('[AuthService] updating password...', password);
		return new Promise((resolve, reject)=>{
			$.ajax({
				url: window.location.origin+'/auth/info',
				method: 'POST',
				data: { password: password }
			})
			.done(function(response){
				console.log(response);
				resolve(response);
				self.getSession()
			})
			.fail(function(error){
				console.log('[AuthService] Problem setting password', error);
				reject({ code: error.status, message: error.responseText });
			})
		})
	}

}

const context = React.createContext();
const service = new AuthService();

const AuthContext = {
	Provider: (props)=>(<context.Provider value={service}>{props.children}</context.Provider>),
	Consumer: context.Consumer
}

export default AuthContext;