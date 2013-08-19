module Math
  # A kind of uniform distribution I don't know the real name of.
  class Bucket
    def initialize buckets
	#puts buckets.class.name
	#puts "Buckets has %d" % [buckets.length]
      @buckets = buckets
    end

    def at value
	parts = @buckets.split(/[\{,\}]/)
	find = 1
	parts.each_with_index do |p, i| 
		#puts p
		if value <= p.to_f then
			find = i
		end
	end
      #find = @buckets.find{|r| value <= r}
      #find ? (@buckets.index(find).to_f / 100) : 1.0
	parts[find].to_f / 100
    end
  end # Bucket
end # Math
