import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as AppleStrategy } from 'passport-apple';

if(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET){
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || (process.env.PUBLIC_API_BASE_URL||'http://localhost:4000') + '/auth/oauth/google/callback'
  }, (_a,_b,profile,done)=>{
    const email=(profile.emails?.[0]?.value||'user@duoaxs.test').toLowerCase();
    return done(null,{id:'u_'+email,email});
  }));
}

if(process.env.APPLE_CLIENT_ID && process.env.APPLE_TEAM_ID && process.env.APPLE_KEY_ID && process.env.APPLE_PRIVATE_KEY){
  passport.use(new AppleStrategy({
    clientID: process.env.APPLE_CLIENT_ID,
    teamID: process.env.APPLE_TEAM_ID,
    keyID: process.env.APPLE_KEY_ID,
    privateKeyString: process.env.APPLE_PRIVATE_KEY.split('\n').join('\n'),
    callbackURL: process.env.APPLE_CALLBACK_URL || (process.env.PUBLIC_API_BASE_URL||'http://localhost:4000') + '/auth/oauth/apple/callback',
    scope: ['name','email']
  }, (_a,_b,_idToken,profile,done)=>{
    const email=(profile?.email || 'user@duoaxs.test').toLowerCase();
    return done(null,{id:'u_'+email,email});
  }));
}

export default passport;
