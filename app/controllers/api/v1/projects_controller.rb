```ruby
module Api
  module V1
    class ProjectsController < ApplicationController
      before_action :authenticate_user!
      before_action :set_project, only: [:show, :update, :destroy]

      def index
        @projects = current_user.projects
        render json: @projects
      end

      def show
        render json: @project
      end

      def create
        @project = current_user.projects.new(project_params)
        if @project.save
          log_audit('create', @project)
          render json: @project, status: :created
        else
          render json: @project.errors, status: :unprocessable_entity
        end
      end

      def update
        if @project.update(project_params)
          log_audit('update', @project)
          render json: @project
        else
          render json: @project.errors, status: :unprocessable_entity
        end
      end

      def destroy
        @project.destroy
        render json: { message: 'Project deleted' }, status: :ok
      end

      private

      def set_project
        @project = current_user.projects.find(params[:id])
      end

      def project_params
        params.require(:project).permit(:title, :description, :status)
      end

      def log_audit(action, project)
        # Assuming an existing logging system
        Rails.logger.info "Project #{action}: #{project.id} by User #{current_user.id}"
      end
    end
  end
end
```