function multiply(num1, num2){
	console.log('Multiplied '+(num1*num2))
	return num1 * num2;
}
multiply.signature = {
	name: 'multiply',
	args: ['number', 'number']
}

module.exports = multiply;