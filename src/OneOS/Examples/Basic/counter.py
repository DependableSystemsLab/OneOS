import time

target = 100
count = 0

while count < target:
    time.sleep(1.0)
    print("Python counter = " + str(count))
    count += 1