require 'yajl'

require 'oursignal/feed/parser'

module Oursignal
  class Feed
    class Parser
      class Reddit < Parser
        def initialize
          super Oursignal::Feed.find('http://reddit.com')
        end

        def urls
          %w{http://www.reddit.com/r/technology/.json, http://www.reddit.com/r/Programming/.json, http://www.reddit.com/r/Linux/.json, http://www.reddit.com/r/artificial/.json, http://www.reddit.com/r/CompSci/.json, http://www.reddit.com/r/algorithms/.json}
        end

        def parse source
          begin
            Yajl.load(source, symbolize_keys: true)[:data][:children].each do |entry|
              begin
                score     = entry[:data][:score].to_i || next
                url       = entry[:data][:url]        || next
                title     = entry[:data][:title]
                entry_url = 'http://www.reddit.com' + entry[:data][:permalink]

                Entry.upsert url: entry_url, feed_id: feed.id, link: {url: url, score_reddit: score, title: title}
              rescue => error
                warn [error.message, *error.backtrace].join("\n")
              end
            end
          rescue => error
            warn [error.message, *error.backtrace].join("\n")
          end
        end
      end # Reddit
    end # Parser
  end # Feed
end # Oursignal

