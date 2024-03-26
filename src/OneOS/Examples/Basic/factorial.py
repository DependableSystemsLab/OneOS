import math

target = 100
count = 0
digits = [ 1 ]

def factorial():
    global count
    count += 1
    carry = 0
    product = 0
    for i in range(len(digits)):
        product = digits[i] * count
        product += carry
        digits[i] = product % 10
        carry = math.floor(product / 10)
    while carry > 0:
        digits.append(carry % 10)
        carry = math.floor(carry / 10)
    if count < target:
        factorial()
    else:
        digits.reverse()
        value = ''.join(map(str,digits))
        print("<<< Computation Finished >>>")
        print("factorial(" + str(target) + ") = " + value)

factorial()