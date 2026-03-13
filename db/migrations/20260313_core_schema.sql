-- LifeOS Core Schema
-- Extracted from server.js initDatabase()
-- Generated: 2026-03-13

CREATE TABLE IF NOT EXISTS conversation_memory (
      id SERIAL PRIMARY KEY,
      memory_id TEXT UNIQUE NOT NULL,
      orchestrator_msg TEXT NOT NULL,
      ai_response TEXT NOT NULL,
      ai_member VARCHAR(50),
      key_facts JSONB,
      context_metadata JSONB,
      memory_type TEXT DEFAULT 'conversation',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

CREATE TABLE IF NOT EXISTS consensus_proposals (
      id SERIAL PRIMARY KEY,
      proposal_id TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      proposed_by VARCHAR(50),
      status VARCHAR(20) DEFAULT 'proposed',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      decided_at TIMESTAMPTZ
    );

CREATE TABLE IF NOT EXISTS debate_arguments (
      id SERIAL PRIMARY KEY,
      proposal_id TEXT NOT NULL,
      ai_member VARCHAR(50) NOT NULL,
      side VARCHAR(20) NOT NULL,
      argument TEXT NOT NULL,
      confidence INT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      FOREIGN KEY(proposal_id) REFERENCES consensus_proposals(proposal_id)
    );

CREATE TABLE IF NOT EXISTS consequence_evaluations (
      id SERIAL PRIMARY KEY,
      proposal_id TEXT NOT NULL,
      ai_member VARCHAR(50) NOT NULL,
      risk_level VARCHAR(20),
      intended_consequences TEXT,
      unintended_consequences TEXT,
      mitigation_strategy TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      FOREIGN KEY(proposal_id) REFERENCES consensus_proposals(proposal_id)
    );

CREATE TABLE IF NOT EXISTS consensus_votes (
      id SERIAL PRIMARY KEY,
      proposal_id TEXT NOT NULL,
      ai_member VARCHAR(50) NOT NULL,
      vote VARCHAR(20),
      reasoning TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      FOREIGN KEY(proposal_id) REFERENCES consensus_proposals(proposal_id)
    );

CREATE TABLE IF NOT EXISTS ai_performance (
      id SERIAL PRIMARY KEY,
      ai_member VARCHAR(50) NOT NULL,
      task_id TEXT,
      task_type VARCHAR(50),
      duration_ms INT,
      tokens_used INT,
      cost DECIMAL(10,4),
      accuracy DECIMAL(5,2),
      success BOOLEAN,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

CREATE TABLE IF NOT EXISTS blind_spots (
      id SERIAL PRIMARY KEY,
      detected_by VARCHAR(50),
      decision_context TEXT,
      blind_spot TEXT,
      severity VARCHAR(20),
      mitigation TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

CREATE TABLE IF NOT EXISTS execution_tasks (
      id SERIAL PRIMARY KEY,
      task_id TEXT UNIQUE NOT NULL,
      type VARCHAR(50),
      description TEXT,
      status VARCHAR(20) DEFAULT 'pending',
      metadata JSONB,
      result TEXT,
      error TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      completed_at TIMESTAMPTZ
    );

CREATE TABLE IF NOT EXISTS build_history (
      id SERIAL PRIMARY KEY,
      build_id TEXT UNIQUE NOT NULL,
      status VARCHAR(20) DEFAULT 'running',
      steps JSONB,
      errors JSONB,
      duration_ms INT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

CREATE INDEX IF NOT EXISTS idx_execution_tasks_status ON execution_tasks(status);

CREATE INDEX IF NOT EXISTS idx_execution_tasks_created ON execution_tasks(created_at);

CREATE TABLE IF NOT EXISTS task_tracking (
      id SERIAL PRIMARY KEY,
      task_id TEXT UNIQUE NOT NULL,
      task_type VARCHAR(50),
      description TEXT,
      expected_outcome TEXT,
      status VARCHAR(20) DEFAULT 'in_progress',
      steps JSONB,
      errors JSONB,
      verification_results JSONB,
      completion_reason TEXT,
      start_time TIMESTAMPTZ,
      end_time TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

CREATE TABLE IF NOT EXISTS daily_ideas (
      id SERIAL PRIMARY KEY,
      idea_id TEXT UNIQUE NOT NULL,
      idea_title TEXT,
      idea_description TEXT,
      proposed_by VARCHAR(50),
      votes_for INT DEFAULT 0,
      votes_against INT DEFAULT 0,
      status VARCHAR(20) DEFAULT 'pending',
      implementation_difficulty VARCHAR(20),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

CREATE TABLE IF NOT EXISTS idea_batches (
      batch_id TEXT PRIMARY KEY,
      focus TEXT NOT NULL,
      target_improvement DECIMAL(6,2),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

CREATE TABLE IF NOT EXISTS idea_batch_items (
      id SERIAL PRIMARY KEY,
      batch_id TEXT REFERENCES idea_batches(batch_id) ON DELETE CASCADE,
      idea_order INT,
      idea_title TEXT,
      idea_description TEXT,
      difficulty VARCHAR(20),
      impact VARCHAR(20),
      revenue_potential DECIMAL(12,2),
      time_to_implement DECIMAL(7,2),
      improvement_pct DECIMAL(6,2),
      proof JSONB,
      status VARCHAR(20) DEFAULT 'pending',
      metrics JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

CREATE INDEX IF NOT EXISTS idx_idea_batch_items_batch ON idea_batch_items(batch_id);

CREATE TABLE IF NOT EXISTS sandbox_tests (
      id SERIAL PRIMARY KEY,
      test_id TEXT UNIQUE NOT NULL,
      code_change TEXT,
      test_result TEXT,
      success BOOLEAN,
      error_message TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

CREATE TABLE IF NOT EXISTS system_snapshots (
      id SERIAL PRIMARY KEY,
      snapshot_id TEXT UNIQUE NOT NULL,
      snapshot_data JSONB,
      version VARCHAR(20),
      reason TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

CREATE TABLE IF NOT EXISTS ai_rotation_log (
      id SERIAL PRIMARY KEY,
      ai_member VARCHAR(50),
      previous_role VARCHAR(100),
      new_role VARCHAR(100),
      performance_score DECIMAL(5,2),
      reason TEXT,
      rotated_at TIMESTAMPTZ DEFAULT NOW()
    );

CREATE TABLE IF NOT EXISTS user_decisions (
      id SERIAL PRIMARY KEY,
      decision_id TEXT UNIQUE NOT NULL,
      context TEXT,
      choice TEXT,
      outcome TEXT,
      riskLevel DECIMAL(3,2),
      timeToDecision INT,
      pattern_match DECIMAL(3,2),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

CREATE TABLE IF NOT EXISTS loss_log (
      id SERIAL PRIMARY KEY,
      timestamp TIMESTAMPTZ DEFAULT NOW(),
      severity VARCHAR(20),
      what_was_lost TEXT,
      why_lost TEXT,
      context JSONB,
      prevention_strategy TEXT
    );

CREATE TABLE IF NOT EXISTS log_fixes (
      id SERIAL PRIMARY KEY,
      error_text TEXT,
      error_type VARCHAR(50),
      fix_action VARCHAR(50),
      fix_description TEXT,
      success BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

CREATE TABLE IF NOT EXISTS execution_tasks (
      id SERIAL PRIMARY KEY,
      task_id TEXT UNIQUE NOT NULL,
      type VARCHAR(50),
      description TEXT,
      status VARCHAR(20) DEFAULT 'queued',
      result TEXT,
      error TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      completed_at TIMESTAMPTZ
    );

CREATE TABLE IF NOT EXISTS income_drones (
      id SERIAL PRIMARY KEY,
      drone_id TEXT UNIQUE NOT NULL,
      drone_type VARCHAR(50),
      status VARCHAR(20) DEFAULT 'active',
      revenue_generated DECIMAL(15,2) DEFAULT 0,
      actual_revenue DECIMAL(15,2) DEFAULT 0,
      projected_revenue DECIMAL(15,2) DEFAULT 0,
      tasks_completed INT DEFAULT 0,
      expected_revenue DECIMAL(15,2) DEFAULT 500,
      deployed_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

ALTER TABLE income_drones ADD COLUMN IF NOT EXISTS expected_revenue DECIMAL(15,2) DEFAULT 500;

ALTER TABLE income_drones ADD COLUMN IF NOT EXISTS actual_revenue DECIMAL(15,2) DEFAULT 0;

ALTER TABLE income_drones ADD COLUMN IF NOT EXISTS projected_revenue DECIMAL(15,2) DEFAULT 0;

CREATE TABLE IF NOT EXISTS daily_spend (
      id SERIAL PRIMARY KEY,
      date DATE UNIQUE NOT NULL,
      usd DECIMAL(15,4) DEFAULT 0,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

CREATE TABLE IF NOT EXISTS financial_ledger (
      id SERIAL PRIMARY KEY,
      tx_id TEXT UNIQUE NOT NULL,
      type TEXT NOT NULL,
      amount DECIMAL(15,2) NOT NULL,
      description TEXT,
      category TEXT,
      external_id TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

CREATE TABLE IF NOT EXISTS roi_tracker (
      id SERIAL PRIMARY KEY,
      daily_ai_cost DECIMAL(15,4) DEFAULT 0,
      daily_revenue DECIMAL(15,4) DEFAULT 0,
      total_tokens_used BIGINT DEFAULT 0,
      total_cost_saved DECIMAL(15,4) DEFAULT 0,
      cache_hits INT DEFAULT 0,
      cache_misses INT DEFAULT 0,
      micro_compression_saves DECIMAL(15,4) DEFAULT 0,
      last_reset TIMESTAMPTZ DEFAULT NOW()
    );

CREATE TABLE IF NOT EXISTS protected_files (
      id SERIAL PRIMARY KEY,
      file_path TEXT UNIQUE NOT NULL,
      reason TEXT NOT NULL,
      can_read BOOLEAN DEFAULT true,
      can_write BOOLEAN DEFAULT false,
      requires_full_council BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

CREATE TABLE IF NOT EXISTS self_modifications (
      id SERIAL PRIMARY KEY,
      mod_id TEXT UNIQUE NOT NULL,
      file_path TEXT NOT NULL,
      change_description TEXT,
      old_content TEXT,
      new_content TEXT,
      status VARCHAR(20) DEFAULT 'applied',
      council_approved BOOLEAN,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

CREATE TABLE IF NOT EXISTS model_routing_log (
      id SERIAL PRIMARY KEY,
      task_type VARCHAR(50),
      risk_level VARCHAR(20),
      user_facing BOOLEAN,
      final_tier INT,
      cost DECIMAL(10,6),
      success BOOLEAN,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

CREATE TABLE IF NOT EXISTS white_label_configs (
      id SERIAL PRIMARY KEY,
      client_id TEXT UNIQUE NOT NULL,
      brand_name TEXT,
      hide_tiers BOOLEAN DEFAULT true,
      hide_models BOOLEAN DEFAULT true,
      hide_costs BOOLEAN DEFAULT true,
      hide_architecture BOOLEAN DEFAULT true,
      custom_domain TEXT,
      custom_logo TEXT,
      api_response_format VARCHAR(20) DEFAULT 'standard',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

CREATE TABLE IF NOT EXISTS outreach_log (
      id SERIAL PRIMARY KEY,
      campaign_id TEXT,
      channel VARCHAR(20),
      recipient TEXT,
      subject TEXT,
      body TEXT,
      status VARCHAR(20),
      external_id TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

CREATE TABLE IF NOT EXISTS outreach_recipients (
      id SERIAL PRIMARY KEY,
      recipient_key TEXT UNIQUE NOT NULL, -- canonical key: email:<addr> OR phone:<e164>
      email TEXT,
      phone TEXT,
      consent_email BOOLEAN DEFAULT false,
      consent_sms BOOLEAN DEFAULT false,
      consent_call BOOLEAN DEFAULT false,
      do_not_contact BOOLEAN DEFAULT false,
      quiet_hours_start_utc INT, -- 0-23
      quiet_hours_end_utc INT,   -- 0-23
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

CREATE INDEX IF NOT EXISTS idx_outreach_recipients_email ON outreach_recipients(email);

CREATE INDEX IF NOT EXISTS idx_outreach_recipients_phone ON outreach_recipients(phone);

CREATE TABLE IF NOT EXISTS crm_contacts (
      id SERIAL PRIMARY KEY,
      name TEXT,
      email TEXT UNIQUE,
      phone TEXT,
      company TEXT,
      tags JSONB DEFAULT '[]',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

CREATE INDEX IF NOT EXISTS idx_crm_contacts_phone ON crm_contacts(phone);

CREATE TABLE IF NOT EXISTS crm_sequences (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

CREATE TABLE IF NOT EXISTS crm_sequence_steps (
      id SERIAL PRIMARY KEY,
      sequence_id INTEGER REFERENCES crm_sequences(id) ON DELETE CASCADE,
      step_order INT NOT NULL,
      channel VARCHAR(20) NOT NULL, -- email|sms|call
      delay_minutes INT DEFAULT 0,
      subject TEXT,
      body_template TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(sequence_id, step_order)
    );

CREATE INDEX IF NOT EXISTS idx_crm_sequence_steps_sequence ON crm_sequence_steps(sequence_id);

CREATE TABLE IF NOT EXISTS crm_sequence_enrollments (
      id SERIAL PRIMARY KEY,
      sequence_id INTEGER REFERENCES crm_sequences(id) ON DELETE CASCADE,
      contact_id INTEGER REFERENCES crm_contacts(id) ON DELETE CASCADE,
      status VARCHAR(20) DEFAULT 'active', -- active|paused|completed|cancelled
      step_index INT DEFAULT 0,
      next_run_at TIMESTAMPTZ DEFAULT NOW(),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

CREATE INDEX IF NOT EXISTS idx_crm_enrollments_due ON crm_sequence_enrollments(status, next_run_at) WHERE status = 'active';

CREATE TABLE IF NOT EXISTS crm_messages (
      id SERIAL PRIMARY KEY,
      enrollment_id INTEGER REFERENCES crm_sequence_enrollments(id) ON DELETE CASCADE,
      contact_id INTEGER REFERENCES crm_contacts(id) ON DELETE CASCADE,
      channel VARCHAR(20),
      subject TEXT,
      body TEXT,
      status VARCHAR(20),
      external_id TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

CREATE INDEX IF NOT EXISTS idx_crm_messages_contact ON crm_messages(contact_id, created_at DESC);

CREATE TABLE IF NOT EXISTS crm_replies (
      id SERIAL PRIMARY KEY,
      contact_id INTEGER REFERENCES crm_contacts(id) ON DELETE CASCADE,
      channel VARCHAR(20),
      message TEXT,
      external_id TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

CREATE TABLE IF NOT EXISTS email_events (
      id SERIAL PRIMARY KEY,
      provider VARCHAR(50) NOT NULL,
      event_type VARCHAR(100) NOT NULL,
      message_id TEXT,
      recipient TEXT,
      severity VARCHAR(20) DEFAULT 'info',
      payload JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

CREATE INDEX IF NOT EXISTS idx_email_events_created_at ON email_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_events_recipient ON email_events(recipient);

CREATE INDEX IF NOT EXISTS idx_email_events_message_id ON email_events(message_id);

CREATE TABLE IF NOT EXISTS email_suppressions (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      suppressed BOOLEAN DEFAULT true,
      reason TEXT,
      provider VARCHAR(50),
      suppressed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

CREATE INDEX IF NOT EXISTS idx_email_suppressions_suppressed ON email_suppressions(suppressed) WHERE suppressed = true;

CREATE TABLE IF NOT EXISTS stripe_webhook_events (
      id SERIAL PRIMARY KEY,
      event_id TEXT UNIQUE NOT NULL,
      event_type TEXT,
      payload JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

CREATE TABLE IF NOT EXISTS billing_projects (
      id SERIAL PRIMARY KEY,
      project_id TEXT UNIQUE NOT NULL,
      stripe_customer_id TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

CREATE INDEX IF NOT EXISTS idx_billing_projects_customer ON billing_projects(stripe_customer_id);

CREATE TABLE IF NOT EXISTS project_subscriptions (
      id SERIAL PRIMARY KEY,
      project_id TEXT NOT NULL,
      stripe_subscription_id TEXT UNIQUE,
      stripe_customer_id TEXT,
      plan TEXT,
      status TEXT,
      cancel_at_period_end BOOLEAN DEFAULT false,
      current_period_start TIMESTAMPTZ,
      current_period_end TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

CREATE INDEX IF NOT EXISTS idx_project_subscriptions_project ON project_subscriptions(project_id);

CREATE TABLE IF NOT EXISTS project_entitlements (
      id SERIAL PRIMARY KEY,
      project_id TEXT NOT NULL,
      entitlement TEXT NOT NULL,
      enabled BOOLEAN DEFAULT false,
      source TEXT,
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(project_id, entitlement)
    );

CREATE INDEX IF NOT EXISTS idx_project_entitlements_project ON project_entitlements(project_id);

CREATE TABLE IF NOT EXISTS ai_response_cache (
      id SERIAL PRIMARY KEY,
      prompt_hash TEXT UNIQUE NOT NULL,
      prompt_text TEXT,
      response_text TEXT,
      model_used VARCHAR(50),
      cost_saved DECIMAL(10,6) DEFAULT 0,
      hit_count INT DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      last_used_at TIMESTAMPTZ DEFAULT NOW()
    );

CREATE INDEX IF NOT EXISTS idx_cache_prompt_hash ON ai_response_cache(prompt_hash);

CREATE INDEX IF NOT EXISTS idx_cache_created_at ON ai_response_cache(created_at);

CREATE INDEX IF NOT EXISTS idx_cache_last_used ON ai_response_cache(last_used_at);

CREATE TABLE IF NOT EXISTS knowledge_base_files (
      id SERIAL PRIMARY KEY,
      file_id TEXT UNIQUE NOT NULL,
      filename TEXT NOT NULL,
      file_path TEXT NOT NULL,
      category VARCHAR(50) DEFAULT 'context',
      tags JSONB DEFAULT '[]',
      description TEXT,
      business_idea BOOLEAN DEFAULT false,
      security_related BOOLEAN DEFAULT false,
      historical BOOLEAN DEFAULT false,
      keywords JSONB DEFAULT '[]',
      search_vector tsvector,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

CREATE TABLE IF NOT EXISTS system_source_of_truth (
      id SERIAL PRIMARY KEY,
      document_type VARCHAR(50) NOT NULL DEFAULT 'master_vision',
      version VARCHAR(20) DEFAULT '1.0',
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      section VARCHAR(100),
      is_active BOOLEAN DEFAULT true,
      priority INT DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

CREATE INDEX IF NOT EXISTS idx_sot_type_active ON system_source_of_truth(document_type, is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_sot_priority ON system_source_of_truth(priority DESC);

CREATE INDEX IF NOT EXISTS idx_kb_search ON knowledge_base_files USING gin(search_vector);

CREATE INDEX IF NOT EXISTS idx_kb_category ON knowledge_base_files(category);

CREATE INDEX IF NOT EXISTS idx_kb_business ON knowledge_base_files(business_idea) WHERE business_idea = true;

CREATE INDEX IF NOT EXISTS idx_kb_security ON knowledge_base_files(security_related) WHERE security_related = true;

CREATE TABLE IF NOT EXISTS user_trials (
      id SERIAL PRIMARY KEY,
      user_id TEXT,
      command_key TEXT,
      duration_days INT DEFAULT 7,
      active BOOLEAN DEFAULT true,
      has_subscription BOOLEAN DEFAULT false,
      source VARCHAR(50),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

CREATE INDEX IF NOT EXISTS idx_trials_user ON user_trials(user_id, command_key);

CREATE INDEX IF NOT EXISTS idx_trials_active ON user_trials(active) WHERE active = true;

CREATE TABLE IF NOT EXISTS cost_analysis_log (
      id SERIAL PRIMARY KEY,
      analysis_data JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

CREATE INDEX IF NOT EXISTS idx_cost_analysis_created ON cost_analysis_log(created_at);

CREATE TABLE IF NOT EXISTS cost_analysis_log (
      id SERIAL PRIMARY KEY,
      analysis_data JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

CREATE INDEX IF NOT EXISTS idx_cost_analysis_created ON cost_analysis_log(created_at);

ALTER TABLE financial_ledger
      ADD COLUMN IF NOT EXISTS external_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_financial_ledger_external
      ON financial_ledger(external_id)
      WHERE external_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS task_improvement_reports (
      id SERIAL PRIMARY KEY,
      task_id TEXT NOT NULL,
      task_description TEXT,
      ai_model VARCHAR(50),
      improvements JSONB DEFAULT '[]',
      vote INT,
      vote_reasoning TEXT,
      recommend BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

CREATE INDEX IF NOT EXISTS idx_improvement_task ON task_improvement_reports(task_id);

CREATE INDEX IF NOT EXISTS idx_improvement_model ON task_improvement_reports(ai_model);

CREATE TABLE IF NOT EXISTS tier0_improvement_ideas (
      idea_id SERIAL PRIMARY KEY,
      idea_text TEXT NOT NULL,
      category VARCHAR(50),
      impact VARCHAR(20),
      effort VARCHAR(20),
      reasoning TEXT,
      source_vote INT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(idea_text)
    );

CREATE INDEX IF NOT EXISTS idx_tier0_ideas_category ON tier0_improvement_ideas(category);

CREATE INDEX IF NOT EXISTS idx_tier0_ideas_impact ON tier0_improvement_ideas(impact);

CREATE TABLE IF NOT EXISTS tier1_pending_ideas (
      id SERIAL PRIMARY KEY,
      idea_text TEXT NOT NULL,
      category VARCHAR(50),
      impact VARCHAR(20),
      effort VARCHAR(20),
      reasoning TEXT,
      source_tier VARCHAR(20),
      status VARCHAR(20) DEFAULT 'pending',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      reviewed_at TIMESTAMPTZ
    );

CREATE INDEX IF NOT EXISTS idx_tier1_pending_status ON tier1_pending_ideas(status);

CREATE TABLE IF NOT EXISTS user_decision_history (
      id SERIAL PRIMARY KEY,
      context JSONB,
      decision TEXT NOT NULL,
      reasoning TEXT,
      timestamp TIMESTAMPTZ DEFAULT NOW(),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

CREATE INDEX IF NOT EXISTS idx_user_decisions_timestamp ON user_decision_history(timestamp);

CREATE TABLE IF NOT EXISTS user_style_profile (
      id INT PRIMARY KEY DEFAULT 1,
      profile_data JSONB,
      accuracy_score DECIMAL(5,4) DEFAULT 0,
      decision_count INT DEFAULT 0,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

CREATE TABLE IF NOT EXISTS ai_effectiveness_ratings (
      id SERIAL PRIMARY KEY,
      ai_member VARCHAR(50) NOT NULL,
      task_type VARCHAR(50),
      effectiveness_score DECIMAL(5,4) DEFAULT 0,
      success_count INT DEFAULT 0,
      total_count INT DEFAULT 0,
      avg_response_time INT,
      cost_efficiency DECIMAL(10,6),
      quality_score DECIMAL(5,4),
      last_rated_at TIMESTAMPTZ DEFAULT NOW(),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(ai_member, task_type)
    );

CREATE INDEX IF NOT EXISTS idx_ai_effectiveness_member ON ai_effectiveness_ratings(ai_member);

CREATE INDEX IF NOT EXISTS idx_ai_effectiveness_task ON ai_effectiveness_ratings(task_type);

CREATE TABLE IF NOT EXISTS error_appearance_times (
      id SERIAL PRIMARY KEY,
      seconds_after_upgrade DECIMAL(10,2) NOT NULL,
      error_count INT DEFAULT 1,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(seconds_after_upgrade)
    );

CREATE INDEX IF NOT EXISTS idx_error_timing_seconds ON error_appearance_times(seconds_after_upgrade);

CREATE TABLE IF NOT EXISTS comprehensive_ideas (
      id SERIAL PRIMARY KEY,
      idea_id TEXT UNIQUE NOT NULL,
      idea_text TEXT NOT NULL,
      original_author VARCHAR(50) DEFAULT 'user',
      contributors JSONB DEFAULT '[]',
      priority VARCHAR(20) DEFAULT 'medium',
      status VARCHAR(20) DEFAULT 'pending',
      rejection_reason TEXT,
      acceptance_reason TEXT,
      impact INT,
      revenue_potential DECIMAL(12,2),
      difficulty VARCHAR(20),
      category VARCHAR(50),
      tags JSONB DEFAULT '[]',
      related_ideas JSONB DEFAULT '[]',
      implementation_notes TEXT,
      estimated_time INT,
      dependencies JSONB DEFAULT '[]',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

CREATE INDEX IF NOT EXISTS idx_comprehensive_ideas_status ON comprehensive_ideas(status);

CREATE INDEX IF NOT EXISTS idx_comprehensive_ideas_author ON comprehensive_ideas(original_author);

CREATE INDEX IF NOT EXISTS idx_comprehensive_ideas_priority ON comprehensive_ideas(priority);

CREATE INDEX IF NOT EXISTS idx_comprehensive_ideas_category ON comprehensive_ideas(category);

CREATE INDEX IF NOT EXISTS idx_comprehensive_ideas_tags ON comprehensive_ideas USING gin(tags);

CREATE TABLE IF NOT EXISTS drone_opportunities (
      id SERIAL PRIMARY KEY,
      drone_id TEXT NOT NULL,
      opportunity_type VARCHAR(50),
      data JSONB,
      status VARCHAR(20) DEFAULT 'pending',
      revenue_estimate DECIMAL(12,2),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      FOREIGN KEY (drone_id) REFERENCES income_drones(drone_id)
    );

CREATE INDEX IF NOT EXISTS idx_drone_opp_drone ON drone_opportunities(drone_id);

CREATE INDEX IF NOT EXISTS idx_drone_opp_type ON drone_opportunities(opportunity_type);

CREATE INDEX IF NOT EXISTS idx_drone_opp_status ON drone_opportunities(status);

ALTER TABLE drone_opportunities ADD COLUMN IF NOT EXISTS priority INT DEFAULT 0;

ALTER TABLE drone_opportunities ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;

ALTER TABLE drone_opportunities ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

ALTER TABLE drone_opportunities ADD COLUMN IF NOT EXISTS actual_revenue DECIMAL(12,2) DEFAULT 0;

ALTER TABLE drone_opportunities ADD COLUMN IF NOT EXISTS execution_data JSONB;

ALTER TABLE drone_opportunities ADD COLUMN IF NOT EXISTS error TEXT;

CREATE TABLE IF NOT EXISTS content_assets (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      opportunity_id TEXT,
      status VARCHAR(20) DEFAULT 'ready_to_publish',
      published_at TIMESTAMPTZ,
      revenue_generated DECIMAL(12,2) DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

CREATE TABLE IF NOT EXISTS service_proposals (
      id SERIAL PRIMARY KEY,
      opportunity_id TEXT,
      proposal_data JSONB,
      status VARCHAR(20) DEFAULT 'ready_to_send',
      sent_at TIMESTAMPTZ,
      response_data JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

CREATE TABLE IF NOT EXISTS vapi_calls (
      id SERIAL PRIMARY KEY,
      call_id TEXT UNIQUE NOT NULL,
      phone_number VARCHAR(20),
      duration INT,
      status VARCHAR(20),
      transcript TEXT,
      recording_url TEXT,
      started_at TIMESTAMPTZ,
      ended_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

CREATE INDEX IF NOT EXISTS idx_vapi_calls_phone ON vapi_calls(phone_number);

CREATE INDEX IF NOT EXISTS idx_vapi_calls_status ON vapi_calls(status);

CREATE INDEX IF NOT EXISTS idx_vapi_calls_created ON vapi_calls(created_at);

CREATE TABLE IF NOT EXISTS autonomous_businesses (
      id SERIAL PRIMARY KEY,
      business_id TEXT UNIQUE NOT NULL,
      business_name TEXT NOT NULL,
      business_type VARCHAR(50),
      revenue_30d DECIMAL(12,2) DEFAULT 0,
      costs_30d DECIMAL(12,2) DEFAULT 0,
      customer_count INT DEFAULT 0,
      health_score INT DEFAULT 50,
      status VARCHAR(20) DEFAULT 'active',
      last_health_check TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

CREATE INDEX IF NOT EXISTS idx_autonomous_businesses_status ON autonomous_businesses(status);

CREATE INDEX IF NOT EXISTS idx_autonomous_businesses_type ON autonomous_businesses(business_type);

CREATE TABLE IF NOT EXISTS revenue_opportunities (
      id SERIAL PRIMARY KEY,
      opportunity_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      revenue_potential DECIMAL(12,2),
      time_to_implement INT,
      required_resources JSONB,
      market_demand TEXT,
      competitive_advantage TEXT,
      roi_score DECIMAL(12,4),
      improvement_pct DECIMAL(6,2),
      status VARCHAR(20) DEFAULT 'pending',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

CREATE INDEX IF NOT EXISTS idx_revenue_opp_status ON revenue_opportunities(status);

CREATE INDEX IF NOT EXISTS idx_revenue_opp_potential ON revenue_opportunities(revenue_potential DESC);

ALTER TABLE revenue_opportunities ADD COLUMN IF NOT EXISTS roi_score DECIMAL(12,4);

ALTER TABLE revenue_opportunities ADD COLUMN IF NOT EXISTS improvement_pct DECIMAL(6,2);

CREATE TABLE IF NOT EXISTS generated_games (
      id SERIAL PRIMARY KEY,
      game_id TEXT UNIQUE NOT NULL,
      game_name TEXT NOT NULL,
      game_type VARCHAR(50),
      complexity VARCHAR(20),
      code_html TEXT,
      code_css TEXT,
      code_js TEXT,
      description TEXT,
      marketing_strategy JSONB,
      monetization VARCHAR(20),
      use_overlay BOOLEAN DEFAULT true,
      status VARCHAR(20) DEFAULT 'generated',
      deployed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

CREATE INDEX IF NOT EXISTS idx_games_type ON generated_games(game_type);

CREATE INDEX IF NOT EXISTS idx_games_status ON generated_games(status);

CREATE TABLE IF NOT EXISTS business_duplications (
      id SERIAL PRIMARY KEY,
      business_id TEXT UNIQUE NOT NULL,
      competitor_name TEXT NOT NULL,
      competitor_url TEXT,
      analysis_data JSONB,
      improvement_target INT,
      implementation_plan JSONB,
      logo_data JSONB,
      status VARCHAR(20) DEFAULT 'analyzed',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

CREATE INDEX IF NOT EXISTS idx_biz_dup_status ON business_duplications(status);

CREATE TABLE IF NOT EXISTS code_services (
      id SERIAL PRIMARY KEY,
      service_id TEXT UNIQUE NOT NULL,
      service_type VARCHAR(50),
      request_data JSONB,
      response_data JSONB,
      status VARCHAR(20) DEFAULT 'completed',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

CREATE INDEX IF NOT EXISTS idx_code_services_type ON code_services(service_type);

CREATE TABLE IF NOT EXISTS makecom_scenarios (
      id SERIAL PRIMARY KEY,
      scenario_id TEXT UNIQUE NOT NULL,
      description TEXT,
      scenario_data JSONB,
      status VARCHAR(20) DEFAULT 'generated',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

CREATE TABLE IF NOT EXISTS zapier_zaps (
      id SERIAL PRIMARY KEY,
      zap_id TEXT UNIQUE NOT NULL,
      description TEXT,
      zap_data JSONB,
      status VARCHAR(20) DEFAULT 'generated',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

CREATE TABLE IF NOT EXISTS approval_requests (
      id SERIAL PRIMARY KEY,
      request_id TEXT UNIQUE NOT NULL,
      type VARCHAR(50),
      description TEXT,
      potential_issues JSONB,
      request_data JSONB,
      status VARCHAR(20) DEFAULT 'pending',
      approval_notes TEXT,
      approved_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

CREATE INDEX IF NOT EXISTS idx_approval_status ON approval_requests(status);

CREATE TABLE IF NOT EXISTS self_funding_spending (
      id SERIAL PRIMARY KEY,
      spending_id TEXT UNIQUE NOT NULL,
      opportunity_name TEXT,
      amount DECIMAL(12,2),
      expected_revenue DECIMAL(12,2),
      projected_roi DECIMAL(5,2),
      category VARCHAR(50),
      status VARCHAR(20) DEFAULT 'pending',
      execution_data JSONB,
      executed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

CREATE INDEX IF NOT EXISTS idx_self_funding_status ON self_funding_spending(status);

CREATE INDEX IF NOT EXISTS idx_self_funding_category ON self_funding_spending(category);

CREATE TABLE IF NOT EXISTS marketing_research (
      id SERIAL PRIMARY KEY,
      research_id TEXT UNIQUE NOT NULL,
      marketer_name VARCHAR(100),
      research_data JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

CREATE INDEX IF NOT EXISTS idx_marketing_research_marketer ON marketing_research(marketer_name);

CREATE TABLE IF NOT EXISTS marketing_playbook (
      id INT PRIMARY KEY DEFAULT 1,
      playbook_data JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

CREATE TABLE IF NOT EXISTS marketing_campaigns (
      id SERIAL PRIMARY KEY,
      campaign_id TEXT UNIQUE NOT NULL,
      client VARCHAR(100) DEFAULT 'lifeos',
      campaign_name TEXT,
      campaign_data JSONB,
      status VARCHAR(20) DEFAULT 'active',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_client ON marketing_campaigns(client);

CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_status ON marketing_campaigns(status);

CREATE TABLE IF NOT EXISTS marketing_content (
      id SERIAL PRIMARY KEY,
      content_id TEXT UNIQUE NOT NULL,
      content_type VARCHAR(50),
      content_data JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

CREATE TABLE IF NOT EXISTS ai_platform_credentials (
      id SERIAL PRIMARY KEY,
      provider VARCHAR(50) UNIQUE NOT NULL,
      encrypted_credentials TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

CREATE TABLE IF NOT EXISTS web_scrapes (
      id SERIAL PRIMARY KEY,
      scrape_id TEXT UNIQUE NOT NULL,
      url TEXT NOT NULL,
      scrape_data JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

CREATE INDEX IF NOT EXISTS idx_web_scrapes_url ON web_scrapes(url);

CREATE TABLE IF NOT EXISTS ai_platform_credentials (
      id SERIAL PRIMARY KEY,
      provider VARCHAR(50) UNIQUE NOT NULL,
      encrypted_credentials TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

CREATE INDEX IF NOT EXISTS idx_ai_credentials_provider ON ai_platform_credentials(provider);

INSERT INTO protected_files (file_path, reason, can_read, can_write, requires_full_council) VALUES
      ('.js', 'Core system', true, false, true),
      ('package.json', 'Dependencies', true, false, true),
      ('.github/workflows/autopilot-build.yml', 'Autopilot', true, false, true),
      ('public/overlay/command-center.html', 'Control panel', true, true, true)
      ON CONFLICT (file_path) DO NOTHING;

CREATE TABLE IF NOT EXISTS boldtrail_agents (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      name VARCHAR(255),
      subscription_tier VARCHAR(50) DEFAULT 'pro',
      stripe_customer_id VARCHAR(255),
      stripe_subscription_id VARCHAR(255),
      subscription_status VARCHAR(50) DEFAULT 'active',
      agent_tone TEXT,
      preferences JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

CREATE TABLE IF NOT EXISTS boldtrail_showings (
      id SERIAL PRIMARY KEY,
      agent_id INTEGER REFERENCES boldtrail_agents(id) ON DELETE CASCADE,
      property_address TEXT NOT NULL,
      property_details JSONB,
      showing_date TIMESTAMPTZ,
      client_name TEXT,
      client_email TEXT,
      client_phone TEXT,
      route_order INTEGER,
      estimated_drive_time INTEGER,
      status VARCHAR(50) DEFAULT 'scheduled',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

CREATE TABLE IF NOT EXISTS boldtrail_email_drafts (
      id SERIAL PRIMARY KEY,
      agent_id INTEGER REFERENCES boldtrail_agents(id) ON DELETE CASCADE,
      draft_type VARCHAR(50),
      recipient_email TEXT,
      recipient_name TEXT,
      subject TEXT,
      content TEXT,
      context_data JSONB,
      status VARCHAR(50) DEFAULT 'draft',
      sent_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

CREATE INDEX IF NOT EXISTS idx_boldtrail_agents_email ON boldtrail_agents(email);

CREATE INDEX IF NOT EXISTS idx_boldtrail_showings_agent ON boldtrail_showings(agent_id);

CREATE INDEX IF NOT EXISTS idx_boldtrail_showings_date ON boldtrail_showings(showing_date);

CREATE INDEX IF NOT EXISTS idx_boldtrail_email_agent ON boldtrail_email_drafts(agent_id);

CREATE INDEX IF NOT EXISTS idx_boldtrail_email_status ON boldtrail_email_drafts(status);

CREATE TABLE IF NOT EXISTS sales_call_recordings (
      id SERIAL PRIMARY KEY,
      agent_id INTEGER REFERENCES boldtrail_agents(id) ON DELETE CASCADE,
      call_id VARCHAR(255) UNIQUE,
      recording_url TEXT,
      recording_type VARCHAR(50) DEFAULT 'phone_call', -- 'phone_call', 'showing_presentation', 'video_call'
      transcript TEXT,
      transcript_segments JSONB, -- Array of {timestamp, speaker, text}
      duration INTEGER, -- seconds
      client_name TEXT,
      client_email TEXT,
      client_phone TEXT,
      property_address TEXT, -- For showing presentations
      status VARCHAR(50) DEFAULT 'recording', -- 'recording', 'completed', 'analyzed'
      ai_analysis JSONB, -- Full AI analysis results
      created_at TIMESTAMPTZ DEFAULT NOW(),
      completed_at TIMESTAMPTZ,
      analyzed_at TIMESTAMPTZ
    );

CREATE TABLE IF NOT EXISTS coaching_clips (
      id SERIAL PRIMARY KEY,
      recording_id INTEGER REFERENCES sales_call_recordings(id) ON DELETE CASCADE,
      agent_id INTEGER REFERENCES boldtrail_agents(id) ON DELETE CASCADE,
      clip_type VARCHAR(50) NOT NULL, -- 'good_moment', 'coaching_needed', 'technique_example'
      start_time INTEGER NOT NULL, -- seconds from start
      end_time INTEGER NOT NULL,
      transcript_segment TEXT,
      ai_analysis JSONB,
      technique_detected VARCHAR(255), -- e.g., 'interrupting_client', 'not_listening', 'excellent_rapport'
      severity VARCHAR(50), -- 'low', 'medium', 'high' (for coaching_needed)
      coaching_suggestion TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

CREATE TABLE IF NOT EXISTS sales_technique_patterns (
      id SERIAL PRIMARY KEY,
      agent_id INTEGER REFERENCES boldtrail_agents(id) ON DELETE CASCADE,
      technique_name VARCHAR(255) NOT NULL,
      pattern_type VARCHAR(50) NOT NULL, -- 'bad_habit', 'good_practice', 'neutral'
      description TEXT,
      frequency INTEGER DEFAULT 1,
      first_detected TIMESTAMPTZ DEFAULT NOW(),
      last_detected TIMESTAMPTZ DEFAULT NOW(),
      examples JSONB, -- Array of clip IDs or transcript snippets
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

CREATE TABLE IF NOT EXISTS real_time_coaching_events (
      id SERIAL PRIMARY KEY,
      recording_id INTEGER REFERENCES sales_call_recordings(id) ON DELETE CASCADE,
      agent_id INTEGER REFERENCES boldtrail_agents(id) ON DELETE CASCADE,
      event_type VARCHAR(50) NOT NULL, -- 'suggestion', 'warning', 'praise', 'technique_detected'
      timestamp INTEGER NOT NULL, -- seconds from call start
      message TEXT NOT NULL,
      severity VARCHAR(50), -- 'low', 'medium', 'high'
      delivered BOOLEAN DEFAULT FALSE, -- Whether coaching was delivered to agent
      delivered_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

CREATE INDEX IF NOT EXISTS idx_call_recordings_agent ON sales_call_recordings(agent_id);

CREATE INDEX IF NOT EXISTS idx_call_recordings_status ON sales_call_recordings(status);

CREATE INDEX IF NOT EXISTS idx_coaching_clips_recording ON coaching_clips(recording_id);

CREATE INDEX IF NOT EXISTS idx_coaching_clips_agent ON coaching_clips(agent_id);

CREATE INDEX IF NOT EXISTS idx_coaching_clips_type ON coaching_clips(clip_type);

CREATE INDEX IF NOT EXISTS idx_technique_patterns_agent ON sales_technique_patterns(agent_id);

CREATE INDEX IF NOT EXISTS idx_technique_patterns_type ON sales_technique_patterns(pattern_type);

CREATE INDEX IF NOT EXISTS idx_coaching_events_recording ON real_time_coaching_events(recording_id);

CREATE INDEX IF NOT EXISTS idx_coaching_events_delivered ON real_time_coaching_events(delivered);

CREATE TABLE IF NOT EXISTS agent_goals (
      id SERIAL PRIMARY KEY,
      agent_id INTEGER REFERENCES boldtrail_agents(id) ON DELETE CASCADE,
      goal_type VARCHAR(50) NOT NULL, -- 'revenue', 'sales', 'calls', 'appointments', 'showings', 'custom'
      goal_name VARCHAR(255) NOT NULL,
      target_value DECIMAL(12,2) NOT NULL,
      current_value DECIMAL(12,2) DEFAULT 0,
      unit VARCHAR(50), -- 'dollars', 'count', 'percentage'
      deadline TIMESTAMPTZ,
      estimated_cost DECIMAL(12,2), -- Cost to achieve goal
      estimated_roi DECIMAL(12,2), -- Expected ROI
      is_worth_it BOOLEAN, -- System evaluation if goal is worth the cost
      status VARCHAR(50) DEFAULT 'active', -- 'active', 'completed', 'paused', 'cancelled'
      breakdown JSONB, -- Breakdown into controllable activities
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

CREATE TABLE IF NOT EXISTS agent_activities (
      id SERIAL PRIMARY KEY,
      agent_id INTEGER REFERENCES boldtrail_agents(id) ON DELETE CASCADE,
      activity_type VARCHAR(50) NOT NULL, -- 'call', 'appointment', 'showing', 'email', 'follow_up', 'training', 'coaching'
      activity_subtype VARCHAR(100), -- 'cold_call', 'warm_call', 'follow_up_call', etc.
      client_name TEXT,
      client_email TEXT,
      client_phone TEXT,
      property_address TEXT,
      duration INTEGER, -- seconds
      outcome VARCHAR(50), -- 'appointment_set', 'no_answer', 'not_interested', 'interested', 'sale', 'showing_scheduled', etc.
      notes TEXT,
      recording_id INTEGER REFERENCES sales_call_recordings(id) ON DELETE SET NULL,
      metadata JSONB, -- Additional activity-specific data
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

CREATE TABLE IF NOT EXISTS agent_calendar_events (
      id SERIAL PRIMARY KEY,
      agent_id INTEGER REFERENCES boldtrail_agents(id) ON DELETE CASCADE,
      event_type VARCHAR(50) NOT NULL, -- 'appointment', 'showing', 'training', 'coaching', 'meeting', 'custom'
      title VARCHAR(255) NOT NULL,
      description TEXT,
      start_time TIMESTAMPTZ NOT NULL,
      end_time TIMESTAMPTZ NOT NULL,
      location TEXT,
      client_name TEXT,
      client_email TEXT,
      client_phone TEXT,
      property_address TEXT,
      is_recurring BOOLEAN DEFAULT FALSE,
      recurrence_pattern JSONB, -- For recurring events
      status VARCHAR(50) DEFAULT 'scheduled', -- 'scheduled', 'completed', 'cancelled', 'no_show'
      auto_record BOOLEAN DEFAULT TRUE, -- Auto-start recording for calls/appointments
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

CREATE TABLE IF NOT EXISTS agent_progression (
      id SERIAL PRIMARY KEY,
      agent_id INTEGER REFERENCES boldtrail_agents(id) ON DELETE CASCADE,
      current_level VARCHAR(50) DEFAULT 'new_agent', -- 'new_agent', 'developing', 'consistent', 'top_performer', 'elite'
      level_progress DECIMAL(5,2) DEFAULT 0, -- 0-100 percentage to next level
      total_sales INTEGER DEFAULT 0,
      total_revenue DECIMAL(12,2) DEFAULT 0,
      skills_assessment JSONB, -- Current skill levels in different areas
      strengths JSONB, -- Activities/skills agent excels at
      improvement_areas JSONB, -- Areas needing development
      next_level_requirements JSONB, -- What's needed to reach next level
      coaching_plan JSONB, -- Personalized coaching plan
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

CREATE TABLE IF NOT EXISTS activity_analytics (
      id SERIAL PRIMARY KEY,
      agent_id INTEGER REFERENCES boldtrail_agents(id) ON DELETE CASCADE,
      activity_type VARCHAR(50) NOT NULL,
      period_start TIMESTAMPTZ NOT NULL, -- Start of period (week/month)
      period_end TIMESTAMPTZ NOT NULL,
      period_type VARCHAR(20) NOT NULL, -- 'daily', 'weekly', 'monthly'
      total_count INTEGER DEFAULT 0,
      success_count INTEGER DEFAULT 0,
      success_rate DECIMAL(5,2) DEFAULT 0, -- percentage
      average_duration INTEGER, -- seconds
      conversion_rate DECIMAL(5,2), -- percentage to next stage
      best_time_of_day VARCHAR(50), -- When agent performs best
      best_day_of_week VARCHAR(50),
      performance_score DECIMAL(5,2), -- Overall performance score
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

CREATE INDEX IF NOT EXISTS idx_agent_goals_agent ON agent_goals(agent_id);

CREATE INDEX IF NOT EXISTS idx_agent_goals_status ON agent_goals(status);

CREATE INDEX IF NOT EXISTS idx_agent_goals_deadline ON agent_goals(deadline);

CREATE INDEX IF NOT EXISTS idx_agent_activities_agent ON agent_activities(agent_id);

CREATE INDEX IF NOT EXISTS idx_agent_activities_type ON agent_activities(activity_type);

CREATE INDEX IF NOT EXISTS idx_agent_activities_created ON agent_activities(created_at);

CREATE INDEX IF NOT EXISTS idx_calendar_events_agent ON agent_calendar_events(agent_id);

CREATE INDEX IF NOT EXISTS idx_calendar_events_start ON agent_calendar_events(start_time);

CREATE INDEX IF NOT EXISTS idx_calendar_events_type ON agent_calendar_events(event_type);

CREATE INDEX IF NOT EXISTS idx_agent_progression_agent ON agent_progression(agent_id);

CREATE INDEX IF NOT EXISTS idx_activity_analytics_agent ON activity_analytics(agent_id);

CREATE INDEX IF NOT EXISTS idx_activity_analytics_period ON activity_analytics(period_start, period_end);

CREATE TABLE IF NOT EXISTS agent_perfect_day (
      id SERIAL PRIMARY KEY,
      agent_id INTEGER REFERENCES boldtrail_agents(id) ON DELETE CASCADE,
      wake_up_time TIME NOT NULL,
      goal_reading_time INTEGER DEFAULT 5, -- minutes
      visualization_time INTEGER DEFAULT 10,
      inspiring_content_url TEXT,
      training_schedule JSONB, -- Array of training activities
      daily_routine JSONB, -- Complete daily routine
      three_most_important JSONB, -- Today's 3 most important tasks
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

CREATE TABLE IF NOT EXISTS agent_daily_log (
      id SERIAL PRIMARY KEY,
      agent_id INTEGER REFERENCES boldtrail_agents(id) ON DELETE CASCADE,
      log_date DATE NOT NULL,
      wake_up_time TIME,
      goal_reading_completed BOOLEAN DEFAULT FALSE,
      visualization_completed BOOLEAN DEFAULT FALSE,
      inspiring_content_watched BOOLEAN DEFAULT FALSE,
      training_completed BOOLEAN DEFAULT FALSE,
      three_most_important JSONB, -- What they committed to
      three_most_important_completed JSONB, -- What they actually did
      day_grade VARCHAR(50), -- 'great', 'good', 'poor'
      day_score INTEGER, -- 0-100
      system_score INTEGER, -- System's assessment
      integrity_score DECIMAL(5,2), -- Based on commitments kept
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

CREATE TABLE IF NOT EXISTS agent_goal_commitments (
      id SERIAL PRIMARY KEY,
      goal_id INTEGER REFERENCES agent_goals(id) ON DELETE CASCADE,
      agent_id INTEGER REFERENCES boldtrail_agents(id) ON DELETE CASCADE,
      commitment_type VARCHAR(50) NOT NULL, -- 'daily_action', 'weekly_milestone', 'behavior'
      commitment_description TEXT NOT NULL,
      penalty_type VARCHAR(50), -- 'financial', 'time', 'privilege', 'custom'
      penalty_description TEXT,
      penalty_amount DECIMAL(10,2), -- If financial
      reward_type VARCHAR(50), -- 'cruise', 'vacation', 'purchase', 'experience', 'custom'
      reward_description TEXT,
      reward_value DECIMAL(10,2),
      agent_decided_worth_it BOOLEAN, -- Agent's decision
      commitment_start_date DATE,
      commitment_end_date DATE,
      status VARCHAR(50) DEFAULT 'active', -- 'active', 'completed', 'failed', 'forgiven'
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

CREATE TABLE IF NOT EXISTS agent_meaningful_moments (
      id SERIAL PRIMARY KEY,
      agent_id INTEGER REFERENCES boldtrail_agents(id) ON DELETE CASCADE,
      moment_type VARCHAR(50) NOT NULL, -- 'winning_moment', 'coaching_moment', 'breakthrough'
      recording_url TEXT,
      transcript TEXT,
      timestamp TIMESTAMPTZ NOT NULL,
      context TEXT,
      tags JSONB,
      playback_count INTEGER DEFAULT 0,
      last_played_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

CREATE TABLE IF NOT EXISTS agent_relationship_mediation (
      id SERIAL PRIMARY KEY,
      agent_id INTEGER REFERENCES boldtrail_agents(id) ON DELETE CASCADE,
      mediation_type VARCHAR(50) NOT NULL, -- 'personal', 'spouse', 'child', 'customer', 'business'
      other_party_name TEXT,
      other_party_contact TEXT,
      issue_description TEXT,
      mediation_status VARCHAR(50) DEFAULT 'requested', -- 'requested', 'in_progress', 'resolved', 'declined'
      agreement_text TEXT,
      both_parties_accepted BOOLEAN DEFAULT FALSE,
      recording_consent BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      resolved_at TIMESTAMPTZ
    );

CREATE TABLE IF NOT EXISTS agent_call_simulations (
      id SERIAL PRIMARY KEY,
      agent_id INTEGER REFERENCES boldtrail_agents(id) ON DELETE CASCADE,
      simulation_type VARCHAR(50) NOT NULL, -- 'practice', 'training', 'skill_building'
      scenario_description TEXT,
      script_guidance JSONB, -- Step-by-step guidance
      closes_to_practice JSONB, -- Array of closes (A/B close, etc.)
      questions_to_ask JSONB, -- Suggested questions
      personality_insights JSONB, -- What we learned about agent
      comfort_zones JSONB, -- Where agent is comfortable/uncomfortable
      recording_id INTEGER REFERENCES sales_call_recordings(id) ON DELETE SET NULL,
      completed BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

CREATE TABLE IF NOT EXISTS agent_integrity_tracking (
      id SERIAL PRIMARY KEY,
      agent_id INTEGER REFERENCES boldtrail_agents(id) ON DELETE CASCADE,
      commitment_id INTEGER REFERENCES agent_goal_commitments(id) ON DELETE SET NULL,
      commitment_made TIMESTAMPTZ NOT NULL,
      commitment_kept BOOLEAN,
      commitment_kept_at TIMESTAMPTZ,
      integrity_score_impact DECIMAL(5,2), -- How this affects overall score
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

CREATE INDEX IF NOT EXISTS idx_perfect_day_agent ON agent_perfect_day(agent_id);

CREATE INDEX IF NOT EXISTS idx_daily_log_agent ON agent_daily_log(agent_id);

CREATE INDEX IF NOT EXISTS idx_daily_log_date ON agent_daily_log(log_date);

CREATE INDEX IF NOT EXISTS idx_goal_commitments_goal ON agent_goal_commitments(goal_id);

CREATE INDEX IF NOT EXISTS idx_goal_commitments_agent ON agent_goal_commitments(agent_id);

CREATE INDEX IF NOT EXISTS idx_meaningful_moments_agent ON agent_meaningful_moments(agent_id);

CREATE INDEX IF NOT EXISTS idx_meaningful_moments_type ON agent_meaningful_moments(moment_type);

CREATE INDEX IF NOT EXISTS idx_relationship_mediation_agent ON agent_relationship_mediation(agent_id);

CREATE INDEX IF NOT EXISTS idx_call_simulations_agent ON agent_call_simulations(agent_id);

CREATE INDEX IF NOT EXISTS idx_integrity_tracking_agent ON agent_integrity_tracking(agent_id);

CREATE TABLE IF NOT EXISTS api_cost_savings_clients (
      id SERIAL PRIMARY KEY,
      company_name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      contact_name VARCHAR(255),
      current_ai_provider VARCHAR(100),
      monthly_spend DECIMAL(12,2),
      use_cases JSONB,
      stripe_customer_id VARCHAR(255),
      subscription_status VARCHAR(50) DEFAULT 'active',
      onboarding_data JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

CREATE TABLE IF NOT EXISTS api_cost_savings_analyses (
      id SERIAL PRIMARY KEY,
      client_id INTEGER REFERENCES api_cost_savings_clients(id) ON DELETE CASCADE,
      analysis_date TIMESTAMPTZ DEFAULT NOW(),
      current_spend DECIMAL(12,2),
      optimized_spend DECIMAL(12,2),
      savings_amount DECIMAL(12,2),
      savings_percentage DECIMAL(5,2),
      optimization_opportunities JSONB,
      recommendations JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

CREATE TABLE IF NOT EXISTS api_cost_savings_metrics (
      id SERIAL PRIMARY KEY,
      client_id INTEGER REFERENCES api_cost_savings_clients(id) ON DELETE CASCADE,
      metric_date DATE NOT NULL,
      tokens_used BIGINT,
      api_calls INT,
      cost DECIMAL(12,2),
      optimized_cost DECIMAL(12,2),
      savings DECIMAL(12,2),
      cache_hit_rate DECIMAL(5,2),
      model_downgrades INT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(client_id, metric_date)
    );

CREATE INDEX IF NOT EXISTS idx_cost_savings_clients_email ON api_cost_savings_clients(email);

CREATE INDEX IF NOT EXISTS idx_cost_savings_analyses_client ON api_cost_savings_analyses(client_id);

CREATE INDEX IF NOT EXISTS idx_cost_savings_metrics_client ON api_cost_savings_metrics(client_id);

CREATE INDEX IF NOT EXISTS idx_cost_savings_metrics_date ON api_cost_savings_metrics(metric_date);

CREATE TABLE IF NOT EXISTS recruitment_leads (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255),
      phone VARCHAR(20),
      email VARCHAR(255),
      source VARCHAR(100),
      status VARCHAR(50) DEFAULT 'new',
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

CREATE TABLE IF NOT EXISTS recruitment_calls (
      id SERIAL PRIMARY KEY,
      lead_id INTEGER REFERENCES recruitment_leads(id) ON DELETE CASCADE,
      call_sid VARCHAR(255),
      call_status VARCHAR(50),
      duration INTEGER,
      transcript TEXT,
      outcome VARCHAR(50),
      next_action VARCHAR(100),
      concerns TEXT,
      scheduled_webinar_id INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

CREATE TABLE IF NOT EXISTS recruitment_webinars (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      scheduled_time TIMESTAMPTZ NOT NULL,
      zoom_link TEXT,
      presentation_data JSONB,
      status VARCHAR(50) DEFAULT 'scheduled',
      attendees JSONB,
      recording_url TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

CREATE TABLE IF NOT EXISTS recruitment_enrollments (
      id SERIAL PRIMARY KEY,
      lead_id INTEGER REFERENCES recruitment_leads(id) ON DELETE CASCADE,
      agent_id INTEGER REFERENCES boldtrail_agents(id) ON DELETE CASCADE,
      webinar_id INTEGER REFERENCES recruitment_webinars(id),
      enrollment_tier VARCHAR(50) DEFAULT 'express',
      status VARCHAR(50) DEFAULT 'enrolled',
      stripe_customer_id VARCHAR(255),
      stripe_subscription_id VARCHAR(255),
      onboarding_stage VARCHAR(50) DEFAULT 'learning',
      mastery_level INT DEFAULT 0,
      unlocked_features JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

CREATE TABLE IF NOT EXISTS agent_feature_unlocks (
      id SERIAL PRIMARY KEY,
      agent_id INTEGER REFERENCES boldtrail_agents(id) ON DELETE CASCADE,
      feature_name VARCHAR(100) NOT NULL,
      unlocked_at TIMESTAMPTZ DEFAULT NOW(),
      mastery_required BOOLEAN DEFAULT true,
      UNIQUE(agent_id, feature_name)
    );

CREATE TABLE IF NOT EXISTS youtube_video_projects (
      id SERIAL PRIMARY KEY,
      agent_id INTEGER REFERENCES boldtrail_agents(id) ON DELETE CASCADE,
      title VARCHAR(255),
      description TEXT,
      script TEXT,
      raw_video_url TEXT,
      edited_video_url TEXT,
      b_roll_added BOOLEAN DEFAULT false,
      enhancements JSONB,
      status VARCHAR(50) DEFAULT 'draft',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

CREATE TABLE IF NOT EXISTS creator_profiles (
      id SERIAL PRIMARY KEY,
      creator_email VARCHAR(255) UNIQUE NOT NULL,
      creator_name VARCHAR(255),
      brand_voice TEXT,
      style_preferences JSONB,
      content_themes JSONB,
      target_audience JSONB,
      platforms JSONB,
      stripe_customer_id VARCHAR(255),
      subscription_tier VARCHAR(50) DEFAULT 'pro',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

CREATE TABLE IF NOT EXISTS creator_content (
      id SERIAL PRIMARY KEY,
      creator_id INTEGER REFERENCES creator_profiles(id) ON DELETE CASCADE,
      content_type VARCHAR(50), -- video, post, reel, story, etc.
      original_url TEXT,
      enhanced_url TEXT,
      title VARCHAR(255),
      description TEXT,
      tags JSONB,
      seo_optimized BOOLEAN DEFAULT false,
      seo_score INT,
      status VARCHAR(50) DEFAULT 'draft',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

CREATE TABLE IF NOT EXISTS creator_posts (
      id SERIAL PRIMARY KEY,
      content_id INTEGER REFERENCES creator_content(id) ON DELETE CASCADE,
      platform VARCHAR(50), -- youtube, instagram, tiktok, twitter, etc.
      post_id VARCHAR(255),
      post_url TEXT,
      scheduled_time TIMESTAMPTZ,
      posted_at TIMESTAMPTZ,
      performance_metrics JSONB,
      status VARCHAR(50) DEFAULT 'scheduled',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

CREATE TABLE IF NOT EXISTS creator_ab_tests (
      id SERIAL PRIMARY KEY,
      creator_id INTEGER REFERENCES creator_profiles(id) ON DELETE CASCADE,
      test_name VARCHAR(255),
      test_type VARCHAR(50), -- title, thumbnail, description, posting_time, etc.
      variants JSONB,
      metrics JSONB,
      winner_variant VARCHAR(100),
      status VARCHAR(50) DEFAULT 'running',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      completed_at TIMESTAMPTZ
    );

CREATE TABLE IF NOT EXISTS creator_enhancements (
      id SERIAL PRIMARY KEY,
      content_id INTEGER REFERENCES creator_content(id) ON DELETE CASCADE,
      enhancement_type VARCHAR(50), -- color_correction, audio_enhancement, b_roll, transitions, etc.
      before_data JSONB,
      after_data JSONB,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    );

CREATE TABLE IF NOT EXISTS creator_analytics (
      id SERIAL PRIMARY KEY,
      creator_id INTEGER REFERENCES creator_profiles(id) ON DELETE CASCADE,
      post_id INTEGER REFERENCES creator_posts(id) ON DELETE CASCADE,
      metric_date DATE NOT NULL,
      views INT DEFAULT 0,
      likes INT DEFAULT 0,
      comments INT DEFAULT 0,
      shares INT DEFAULT 0,
      engagement_rate DECIMAL(5,2),
      reach INT DEFAULT 0,
      impressions INT DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(post_id, metric_date)
    );

CREATE INDEX IF NOT EXISTS idx_creator_profiles_email ON creator_profiles(creator_email);

CREATE INDEX IF NOT EXISTS idx_creator_content_creator ON creator_content(creator_id);

CREATE INDEX IF NOT EXISTS idx_creator_posts_content ON creator_posts(content_id);

CREATE INDEX IF NOT EXISTS idx_creator_posts_platform ON creator_posts(platform);

CREATE INDEX IF NOT EXISTS idx_creator_ab_tests_creator ON creator_ab_tests(creator_id);

CREATE INDEX IF NOT EXISTS idx_creator_ab_tests_status ON creator_ab_tests(status);

CREATE TABLE IF NOT EXISTS build_artifacts (
      id SERIAL PRIMARY KEY,
      opportunity_id TEXT NOT NULL,
      build_type VARCHAR(50),
      files JSONB,
      status VARCHAR(50) DEFAULT 'generated',
      deployed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

CREATE TABLE IF NOT EXISTS deployments (
      id SERIAL PRIMARY KEY,
      opportunity_id TEXT UNIQUE NOT NULL,
      deployment_type VARCHAR(50),
      status VARCHAR(50) DEFAULT 'pending',
      deployed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

CREATE INDEX IF NOT EXISTS idx_build_artifacts_opportunity ON build_artifacts(opportunity_id);

CREATE INDEX IF NOT EXISTS idx_build_artifacts_status ON build_artifacts(status);

CREATE INDEX IF NOT EXISTS idx_deployments_status ON deployments(status);

CREATE TABLE IF NOT EXISTS prospect_sites (
      id SERIAL PRIMARY KEY,
      client_id TEXT UNIQUE NOT NULL,
      business_url TEXT,
      contact_email TEXT,
      contact_name TEXT,
      business_name TEXT,
      preview_url TEXT,
      email_sent BOOLEAN DEFAULT false,
      follow_up_count INT DEFAULT 0,
      last_follow_up_at TIMESTAMPTZ,
      status VARCHAR(20) DEFAULT 'sent',
      deal_value DECIMAL(10,2),
      metadata JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

CREATE INDEX IF NOT EXISTS idx_prospect_sites_email ON prospect_sites(contact_email);

CREATE INDEX IF NOT EXISTS idx_prospect_sites_status ON prospect_sites(status);

CREATE TABLE IF NOT EXISTS virtual_class_enrollments (
      id SERIAL PRIMARY KEY,
      student_email VARCHAR(255) NOT NULL,
      student_name VARCHAR(255),
      progress JSONB,
      current_module VARCHAR(100),
      completed_modules JSONB,
      enrolled_in_express BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

CREATE TABLE IF NOT EXISTS virtual_class_modules (
      id SERIAL PRIMARY KEY,
      module_name VARCHAR(255) NOT NULL,
      module_order INT NOT NULL,
      content JSONB,
      video_url TEXT,
      assignments JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

CREATE INDEX IF NOT EXISTS idx_recruitment_leads_status ON recruitment_leads(status);

CREATE INDEX IF NOT EXISTS idx_recruitment_calls_lead ON recruitment_calls(lead_id);

CREATE INDEX IF NOT EXISTS idx_recruitment_webinars_time ON recruitment_webinars(scheduled_time);

CREATE INDEX IF NOT EXISTS idx_enrollments_lead ON recruitment_enrollments(lead_id);

CREATE INDEX IF NOT EXISTS idx_feature_unlocks_agent ON agent_feature_unlocks(agent_id);

CREATE INDEX IF NOT EXISTS idx_youtube_agent ON youtube_video_projects(agent_id);

CREATE INDEX IF NOT EXISTS idx_class_enrollments_email ON virtual_class_enrollments(student_email);
