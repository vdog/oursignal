require 'nokogiri'
require 'open-uri'

require 'oursignal/feed/parser'

module Oursignal
  class Feed
    class Parser
      class Digg < Parser
        def initialize
          super Oursignal::Feed.find('http://digg.com')
        end

        def urls
          %w{http://digg.com}
        end

        def parse source
          begin
	    doc = Nokogiri::HTML(source) || return
	    doc.search('//article').each do |entry|
              begin
                score     = entry['data-diggs'].to_i || next
                url       = entry['data-contenturl']        || next
                title     = entry.search('a.story-title-link')[0].content.strip
                entry_url = entry['data-contenturl']

                Entry.upsert url: entry_url, feed_id: feed.id, link: {url: url, score_digg: score, title: title}
              rescue => error
                warn [error.message, *error.backtrace].join("\n")
              end
            end
	    doc.search('//story-trending-container').each do |entry|
              begin
                score     = entry['data-diggs'].to_i || next
                url       = entry['data-contenturl']        || next
                title     = entry.search('a.story-link')[0].content.strip
                entry_url = entry['data-contenturl']

                Entry.upsert url: entry_url, feed_id: feed.id, link: {url: url, score_digg: score, title: title}
              rescue => error
                warn [error.message, *error.backtrace].join("\n")
              end
            end
	    doc.search('//story-row').each do |entry|
              begin
                score     = entry['data-diggs'].to_i || next
                url       = entry['data-contenturl']        || next
                title     = entry.search('a.story-link')[0].content.strip
                entry_url = entry['data-contenturl']

                Entry.upsert url: entry_url, feed_id: feed.id, link: {url: url, score_digg: score, title: title}
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

