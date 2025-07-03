export interface Job {
    id: string;
    event_id: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    input_text?: string;
    summary?: string;
    checklist?: string;
    error_message?: string;
    created_at: Date;
    updated_at: Date;
  }
  
  export interface JobResponse {
    status: Job['status'];
    result?: {
      summary: string;
      checklist: string;
    };
    error?: string;
  }