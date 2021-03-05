import passport from 'passport';
import passportjwt from 'passport-jwt';
import passportlocal from 'passport-local';
import dotenv from 'dotenv';
import User from '../models/User';
import { ErrorResponse } from '../utils/ErrorResponse';
import { sendEmail } from '../utils/sendEmail';

dotenv.config({ path: 'config.env' }); // THIS IS REQUIRED OTHERWISE TypeError: JwtStrategy requires a secret or key
const jwtStrategy = passportjwt.Strategy;
const localStrategy = passportlocal.Strategy;
const ExtractJwt = passportjwt.ExtractJwt;
const secret = process.env.JWT_SECRET;

// Authenticating user from jwt token
passport.use(
  new jwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: secret,
    },
    async (payload, done) => {
      // Paylod is extracted jwt

      const user = await User.findById(payload.id);

      if (!user) {
        return done(new ErrorResponse(`User not found`, 404), false);
      }

      return done(null, user); // sets user to req.user
    }
  )
);

/**
 * Login user explained:
 * 1. Passport takes data from req.body.email and req.body password and passes it to callback function
 * 2. In callback function we check if user exists in our db, then we check if password matches using User schema instance method matchPassword
 * 3. If all the checks pass then we pass the user to req.user
 * 4. In route '/api/v1/user/login' we execute the login function from '../controllers/user'
 * 5. In that function we execute User schema method getSignedJwtToken to get a jwt token
 * 6. We create a cookie with the token
 */

passport.use(
  'login',
  new localStrategy(
    {
      usernameField: 'email',
      passwordField: 'password',
    },
    async (email, password, done) => {
      try {
        const user = await User.findOne({ email }).select('+password');

        if (!user) {
          return done(
            new ErrorResponse(`User with email ${email} not found`, 404),
            false
          );
        }

        const validate = await user.matchPassword(password);

        if (!validate) {
          return done(new ErrorResponse(`Invalid credentials`, 401), false);
        }

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  )
);

// Register user
passport.use(
  'register',
  new localStrategy(
    {
      usernameField: 'email',
      passwordField: 'password',
      passReqToCallback: true,
    },
    async (req, email, password, done) => {
      try {
        // Check if user is trying to register as admin
        if (req.body.role === 'ADMIN')
          throw new ErrorResponse('You can not register as an ADMIN', 401);

        const [
          token,
          hashedToken,
          tokenExpiration,
        ] = User.getVerifyEmailToken();

        const newUser = await User.create({
          name: req.body.name,
          email,
          password,
          role: req.body.role || 'USER',
          verifyEmailToken: hashedToken,
          verifyEmailTokenExpire: tokenExpiration,
        });

        const siteUrl = `${req.protocol}://${req.get(
          'host'
        )}/api/v1/user/verifyemail/${token}`;

        const message = `You are receiving this email because you (or someone else) has created an account in Marketplace. Please verify your email at \n\n${siteUrl}\n\nLink expires in 24 hours`;
        await sendEmail({
          email,
          subject: 'Welcome to Marketplace',
          message,
        });

        return done(null, newUser);
      } catch (err) {
        return done(err);
      }
    }
  )
);
