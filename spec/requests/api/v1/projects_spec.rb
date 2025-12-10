```ruby
require 'rails_helper'

RSpec.describe "Api::V1::Projects", type: :request do
  let(:user) { create(:user) }
  let(:headers) { { "Authorization" => "Bearer #{user.auth_token}" } }

  describe "GET /index" do
    it "returns a list of projects" do
      create_list(:project, 3, user: user)
      get api_v1_projects_path, headers: headers
      expect(response).to have_http_status(:success)
      expect(json.size).to eq(3)
    end
  end

  describe "POST /create" do
    let(:valid_attributes) { { title: "New Project", status: "new" } }

    it "creates a new project" do
      expect {
        post api_v1_projects_path, params: { project: valid_attributes }, headers: headers
      }.to change(Project, :count).by(1)
      expect(response).to have_http_status(:created)
    end
  end

  # Continue with other actions like update, show, destroy...
end
```