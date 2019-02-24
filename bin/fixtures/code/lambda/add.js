function add(num1, num2){
	console.log('Added '+(num1+num2))
	return num1 + num2;
}
add.signature = {
	name: 'add',
	args: ['number', 'number']
}

module.exports = add;