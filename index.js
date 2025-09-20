const { createClient } = window.supabase;

const supabaseUrl = 'https://nowlgjwlsaotkcniiswy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5vd2xnandsc2FvdGtjbmlpc3d5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyMjQ3ODMsImV4cCI6MjA2OTgwMDc4M30.b0qzgGVWqxRIoEK485QX1pnXFqIPziG7jIr0vyj1L1U'; 

const supabaseClient = createClient(supabaseUrl, supabaseKey);

let isLoading = false;
let isSigningIn = false; // Flag to track if user is actively signing in/up

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    checkExistingSession();
});

function setupEventListeners() {
    document.getElementById('signinForm').addEventListener('submit', handleSignIn);
    document.getElementById('signupForm').addEventListener('submit', handleSignUp);
}

// Tab switching
function switchTab(tab) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');

    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById(tab + '-content').classList.add('active');

    hideMessage();
}

// Password toggle
function togglePassword(inputId, button) {
    const input = document.getElementById(inputId);
    const icon = button.querySelector('i');
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.replace('fa-eye', 'fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.replace('fa-eye-slash', 'fa-eye');
    }
}

// Password validation
function showPasswordHint() {
    document.getElementById('passwordHint').classList.add('show');
}
function hidePasswordHint() {
    setTimeout(() => {
        document.getElementById('passwordHint').classList.remove('show');
    }, 200);
}
function validatePassword() {
    const password = document.getElementById('signup-password').value;
    const isValid = password.length >= 6;
    const input = document.getElementById('signup-password');
    input.style.borderColor = password && !isValid ? '#ef4444' : '#cbd5e1';
    return isValid;
}
function validatePasswordMatch() {
    const password = document.getElementById('signup-password').value;
    const confirm = document.getElementById('signup-confirm-password').value;
    const input = document.getElementById('signup-confirm-password');
    input.style.borderColor = confirm && password !== confirm ? '#ef4444' : '#cbd5e1';
    return password === confirm;
}

async function handleSignIn(e) {
    e.preventDefault();
    if (isLoading) return;

    const email = document.getElementById('signin-username').value.trim();
    const password = document.getElementById('signin-password').value;

    if (!email || !password) {
        showMessage('error', 'Please enter your email and password');
        return;
    }

    isSigningIn = true; // Set flag to indicate active sign-in
    setLoading(true, 'signinBtn', 'Signing in...');

    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) {
            showMessage('error', error.message);
            setLoading(false, 'signinBtn', 'Sign In');
            isSigningIn = false;
            return;
        }

        // Get user profile from profiles table
        const { data: profile, error: profileError } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

        if (profileError) {
            console.warn('Profile not found, user may need to complete setup');
        }

        showMessage('success', `Welcome back${profile ? ', ' + profile.full_name : ''}!`);

    } catch (err) {
        console.error('Sign in error:', err);
        showMessage('error', 'Something went wrong. Please try again.');
        setLoading(false, 'signinBtn', 'Sign In');
        isSigningIn = false;
    }
}

async function handleSignUp(e) {
    e.preventDefault();
    if (isLoading) return;

    const fullName = document.getElementById('signup-fullname').value.trim();
    const username = document.getElementById('signup-username').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('signup-confirm-password').value;
    const role = document.getElementById('signup-role').value;

    if (!fullName || !username || !email || !password || !confirmPassword || !role) {
        showMessage('error', 'Please fill in all fields');
        return;
    }
    if (!validatePassword()) {
        showMessage('error', 'Password must be at least 6 characters');
        return;
    }
    if (password !== confirmPassword) {
        showMessage('error', 'Passwords do not match');
        return;
    }

    isSigningIn = true; // Set flag to indicate active sign-up
    setLoading(true, 'signupBtn', 'Creating account...');

    try {
        // Sign up with Supabase Auth
        const { data, error } = await supabaseClient.auth.signUp({
            email: email,
            password: password,
            options: {
                emailRedirectTo: window.location.origin,
                data: {
                    full_name: fullName,
                    username: username,
                    role: role
                }
            }
        });

        if (error) {
            showMessage('error', error.message);
            setLoading(false, 'signupBtn', 'Create Account');
            isSigningIn = false;
            return;
        }

        // Create profile record
        if (data.user) {
            const { error: profileError } = await supabaseClient
                .from('profiles')
                .insert([{
                    id: data.user.id,
                    full_name: fullName,
                    username: username,
                    email: email,
                    role: role,
                    created_at: new Date().toISOString()
                }]);

            if (profileError) {
                console.warn('Profile creation failed:', profileError);
            }
        }

        // Check if email confirmation is required
        if (data.user && !data.session) {
            // Email confirmation required
            showMessage('success', 'Account created successfully! Please check your email to verify your account.');
            document.getElementById('signupForm').reset();
            setTimeout(() => switchTab('signin'), 3000);
            isSigningIn = false;
        } else if (data.session) {
            // Auto sign-in successful (no email confirmation required)
            showMessage('success', 'Account created and signed in successfully!');
        }

    } catch (err) {
        console.error('Sign up error:', err);
        showMessage('error', 'Something went wrong. Please try again.');
        isSigningIn = false;
    } finally {
        setLoading(false, 'signupBtn', 'Create Account');
    }
}

// Utility functions
function setLoading(loading, buttonId, text) {
    isLoading = loading;
    const button = document.getElementById(buttonId);
    if (loading) {
        button.classList.add('loading');
        button.disabled = true;
        button.textContent = text;
    } else {
        button.classList.remove('loading');
        button.disabled = false;
        button.textContent = text;
    }
}

function showMessage(type, text) {
    const message = document.getElementById('message');
    message.className = `message ${type} show`;
    message.textContent = text;
    setTimeout(hideMessage, 5000);
}
function hideMessage() {
    document.getElementById('message').classList.remove('show');
}

// ✅ Only checks session (no redirect)
async function checkExistingSession() {
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session) {
            console.log('Existing session found. User is already signed in.');
        }
    } catch (error) {
        console.error('Session check error:', error);
    }
}

// ✅ Redirect only after actual sign in/up
supabaseClient.auth.onAuthStateChange((event, session) => {
    console.log('Auth state changed:', event, session);

    if (event === 'SIGNED_IN' && session) {
        console.log('User signed in:', session.user);
        if (isSigningIn) {
            isSigningIn = false; // reset flag
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 500);
        }
    } else if (event === 'SIGNED_OUT') {
        console.log('User signed out');
        isSigningIn = false;
    }
});

