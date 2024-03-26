$stdout.sync = true

count = 0
while count < 100
  sleep(1)
  puts "Ruby counter = #{count}"
  count += 1
end