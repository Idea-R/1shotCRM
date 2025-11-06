-- Add user credits table for API call tracking
CREATE TABLE IF NOT EXISTS user_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credits INTEGER DEFAULT 100,
  total_used INTEGER DEFAULT 0,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_credits_user_id ON user_credits(user_id);

-- Enable RLS
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own credits
CREATE POLICY "Users can view own credits" ON user_credits
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can update their own credits (for decrementing)
CREATE POLICY "Users can update own credits" ON user_credits
  FOR UPDATE USING (auth.uid() = user_id);

-- Function to initialize credits for new users
CREATE OR REPLACE FUNCTION initialize_user_credits()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_credits (user_id, credits, plan)
  VALUES (NEW.id, 100, 'free')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create credits when user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION initialize_user_credits();

-- Function to check and decrement credits
CREATE OR REPLACE FUNCTION use_credit(user_uuid UUID, amount INTEGER DEFAULT 1)
RETURNS BOOLEAN AS $$
DECLARE
  current_credits INTEGER;
BEGIN
  SELECT credits INTO current_credits
  FROM user_credits
  WHERE user_id = user_uuid;
  
  IF current_credits IS NULL THEN
    -- Initialize if doesn't exist
    INSERT INTO user_credits (user_id, credits, plan)
    VALUES (user_uuid, 100, 'free')
    ON CONFLICT (user_id) DO NOTHING;
    current_credits := 100;
  END IF;
  
  IF current_credits >= amount THEN
    UPDATE user_credits
    SET credits = credits - amount,
        total_used = total_used + amount,
        updated_at = NOW()
    WHERE user_id = user_uuid;
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

