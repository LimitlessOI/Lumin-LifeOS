class PaymentsController < ApplicationRecord
  before_action :set_user # assume user can only access their payment information and stripe setup
  
  def create
    if @payment = Stripe::Payment.create(
      customer: current_user.stripe_customer,
      amount: calculate_amount(@task),
      currency: Rails.application.credit_card_currency # assuming this is configured elsewhere in the application
    )
    
    @payment.update(status: :paid) if @payment.present? && @payment.success? 
    redirect_to user_path(@user), notice: 'Payment successful!'
  rescue Stripe::StripeObjectError => e # handle any stripe errors gracefully here, providing a meaningful response to the frontend application about what went wrong and offering options for retry or escalation.
    flash[:error] = "There was an issue with processing your payment: #{e.message}" 
    redirect_to user_path(@user) # Assuming @user is bound to current_user in a controller method here, typically set by authentication mechanism before reaching this point within request lifecycle on Rails backend.
  end
end