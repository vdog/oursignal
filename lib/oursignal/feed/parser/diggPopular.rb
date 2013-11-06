require 'yajl'

require 'oursignal/feed/parser'

module Oursignal
  class Feed
    class Parser
      class DiggPopular < Parser
        def initialize
          super Oursignal::Feed.find('http://digg.com')
        end

        def urls
          %w{http://digg.com/api/news/popular.json}
        end

        def parse source
          begin
            Yajl.load(source, symbolize_keys: true)[:data][:feed].each do |entry|
              begin
                score     = entry[:diggs][:count].to_i || next
                url       = entry[:content][:url]        || next
                title     = entry[:content][:title]
                entry_url = url

                Entry.upsert url: entry_url, feed_id: feed.id, link: {url: url, score_digg: score, title: title}
              rescue => error
                warn [error.message, *error.backtrace].join("\n")
              end
            end
          rescue => error
            warn [error.message, *error.backtrace].join("\n")
          end
        end
      end # DiggPopular
    end # Parser
  end # Feed
end # Oursignal

