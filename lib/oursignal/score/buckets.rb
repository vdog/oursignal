require 'oursignal/score'
require 'oursignal/score_bucket'

module Oursignal
  class Score
    module Buckets
      def self.perform
        Oursignal.db.transaction do
	#	raise "Vince wants to stop here"
          Oursignal.db.execute('delete from score_buckets') # Last bucket run.
          Score.sources.each do |source|
            total, max = Oursignal.db.execute("select count(*) as total, max(#{source}) from links where #{source} > 0 and (now() - updated_at < interval'1 days')").first.values_at(:total, :max)
            next unless total > 100

            score_st = Oursignal.db.prepare("select #{source} as score from links where #{source} > 0 order by #{source} limit 1 offset ?")
            buckets  = (0..99).map do |offset|
              score_st.execute((total * (offset.to_f / 100)).to_i).first[:score].to_f
            end
		puts source
		str_buckets = '{' + buckets[0].to_s
		(1..99).each do |value|
			str_buckets += ", " + buckets[value].to_s 
		end
		str_buckets += '}'
		puts str_buckets
            #ScoreBucket.create(source: source, buckets: buckets)
            ScoreBucket.create(source: source, buckets: str_buckets)
          end
        end
      end
    end # Buckets
  end # Score
end # Oursignal
