require 'curb'
require 'time'
require 'zlib'

# Business.
require 'oursignal/link'
require 'oursignal/score'
require 'oursignal/score/parser'

module Oursignal
  class Score

    #--
    # TODO: Reader is almost identical to lib/oursignal/feed/reader.rb
    module Reader
      def self.perform
        # log     = File.open(File.join(Oursignal.root, 'tmp', 'score_reader.log'), 'w')
        sources = Oursignal::Score::Parser.all
        links   = Link.execute(%q{
          select * from links
          where created_at > now() - interval '6 hours'
        })

        # TODO: Safe distance from (ulimit -n) - (lsof | wc -l)
        multi = Curl::Multi.new
        multi.max_connects = 250
        sources.each do |source|
          parser = source.new(links)
          parser.urls.each do |url|
            easy = Curl::Easy.new(url) do |e|
              e.resolve_mode          = :ipv4 # IPv6 has issues on some sites!?
              e.follow_location       = true
              e.timeout               = 60
              e.headers['User-Agent'] = Oursignal::USER_AGENT
              e.on_complete do |response|
                begin
                  #puts 'score:(%s) %d %4.2fkb %4.2fkb/s' % [
                  #  response.url,
                  #  response.response_code,
                  #  response.downloaded_bytes / 1024,
                  #  response.download_speed / 1024
                  #]
                  # XXX Debugging for now.
                  #log.puts(
                  #  '----',
                  #  response.response_code,
                  #  response.last_effective_url,
                  #  force_utf8(body(response)),
                  #  "\n\n"
                  #)
                  parser.parse(response.url, force_utf8(body(response))) if response.response_code.to_s =~ /^2/
                rescue => error
                  warn ['Score Reader GET Error:', error.message, *error.backtrace].join("\n")
                end
              end
              e.on_failure do |response, code|
                warn ['(on_failure)Score Reader GET Error:', url.to_s, code].join("\n")
              end
            end
            multi.add easy
          end
        end
        multi.perform
        # log.close
      end

      protected
        def self.body curl
          if curl.header_str.match(/.*Content-Encoding:\sgzip\r/)
            begin
              gz   = Zlib::GzipReader.new(StringIO.new(curl.body_str))
              body = gz.read
              gz.close
              body
            rescue Zlib::GzipFile::Error
              curl.body_str
            end
          else
            curl.body_str
          end
        end

        #--
        # TODO: Steal code from https://github.com/stateless-systems/metauri/blob/master/lib/metauri/location/resolve.rb
        def self.force_utf8 raw
          options = {invalid: :replace, undef: :replace}
          raw.valid_encoding? ? raw.encode('utf-8', options) : raw.force_encoding('utf-8').encode('utf-8', options)
        rescue => error
          warn ['Score Reader UTF-8 Error:', error.message, *error.backtrace].join("\n")
          ''
        end

    end # Reader
  end # Score
end # Oursignal

