const FILESYSTEM_FIXTURE = {
	'conf': {
		'smtp.json': 'smtp.json'
	},
	'code': {
		'samples': {
			'factorial.js': 'factorial.js',
			'hello-world.py': 'hello-world.py',
			'dummy-cpu.js': 'dummy-cpu.js',
			'dummy-memory.js': 'dummy-memory.js'
		},
		'basic': {
			'writer.js': 'writer.js',
			'reader.js': 'reader.js',
			'dummy.js': 'dummy.js',
			'lambda.js': 'lambda.js',
			'hash.js': 'hash.js',
			'observer.js': 'observer.js',
			'detector.js': 'detector.js',
			'notifier.js': 'notifier.js',
			'recorder.js': 'recorder.js'
		},
		'lambda': {
			'add.js': 'add.js',
			'multiply.js': 'multiply.js',
			'hash.js': 'hash.js'
		}
	},
	'data': {

	},
	'user': {}
}

module.exports = FILESYSTEM_FIXTURE;

/** 
 * As a reference, below is a classical linux file system layout
 *
 * /bin			common binary executables
 * /boot		startup files and kernel, grub data
 * /dev			peripheral hardware references
 * /etc			system configuration files
 * /home		user directory
 * /initrd		boot info
 * /lib			library files
 * /lost+found
 * /misc
 * /mnt			mount point for external file systems
 * /net			mount point for network file systems
 * /opt			extra software
 * /proc		special process reference files and file descriptors
 * /root		admin directory
 * /sbin		priviliged system binary executables
 * /tmp			temporary space
 * /usr			user-related programs
 * /var			variable and temporary files for users (like logs)
 */