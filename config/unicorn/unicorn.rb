require File.join(File.dirname(__FILE__), '..', '..', 'lib', 'oursignal')
require File.join(Oursignal.root, 'config', 'unicorn', 'config')

env     = ENV['RACK_ENV'] || 'development'
options = UNICORN_CONFIG[env.to_sym]

timeout 30

pid              options[:pidfile] if options[:pidfile]
worker_processes options[:workers] if options[:workers]
stderr_path      options[:stderr]  if options[:stderr]
stdout_path      options[:stdout]  if options[:stdout]

#listen options[:socket], backlog: options[:backlog] if options.key?(:socket)
listen "/tmp/oursignal.socket", :backlog => 64
preload_app true
pid "/tmp/unicorn.oursignal.pid"

if options.key?(:port)
  port = options[:port]
  port = [ port ] unless port.is_a?(Array)
  port.each{|p| listen p, tcp_nopush: true }
end

before_fork do |server, worker|
# Before forking, kill the master process that belongs to the .oldbin PID.
  # This enables 0 downtime deploys.
  old_pid = "/tmp/unicorn.my_site.pid.oldbin"
  if File.exists?(old_pid) && server.pid != old_pid
    begin
      Process.kill("QUIT", File.read(old_pid).to_i)
    rescue Errno::ENOENT, Errno::ESRCH
      # someone else did our job for us
    end
  end
end

after_fork do |server,worker|
  Swift.setup(:default, Swift::Adapter::Postgres, db: 'oursignal')
end

preload_app true
