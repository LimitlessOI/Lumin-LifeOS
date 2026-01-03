```ruby
    Stripe::Configuration.api_key = API_SECRET # Replace with actual secret... 
    
    if Rails.env == 'production' && ENV['STRIPE'] != nil
      stripe_adapter(self: :stripe) do |app|
        app.default_plan = { id: "premium-webinar", price: pricing } # Define your plans...
        
        def process_checkout(*args, **kwargs)
          user_info = UserInfo.find(current_user.id) 
          
          customer = Stripe::Customer.create({
            email: user_info.email,
            source: payment_token, # Obtained via MetaMask or similar...
            plan: default_plan[:price] if available
          })
        end
      end