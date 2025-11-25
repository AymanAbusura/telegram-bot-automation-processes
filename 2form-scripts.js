const generateFormScriptsContentForTwoForms = (countryCode) => {
  const safeCountryCode = countryCode.toUpperCase();

  return `
document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('form').forEach(form => {

    const phoneInput = form.querySelector('input[name="phone"]');
    const inputs = form.querySelectorAll('input[data-validation-status]');
    const submitBtn = form.querySelector('button[type="submit"], input[type="submit"]');
    const errors = {};

    if (submitBtn) submitBtn.disabled = true;

    inputs.forEach(input => {
      errors[input.name] = true;
    });

    let iti = null;
    if (phoneInput) {
      iti = window.intlTelInput(phoneInput, {
        utilsScript: "utils.js",
        autoPlaceholder: "aggressive",
        separateDialCode: true,
        hiddenInput: 'full_phone',
        onlyCountries: ['${safeCountryCode}']
      });
    }

    function showError(input, errorBlock, fieldName) {
      errors[fieldName] = true;
      input.dataset.errorStatus = 'active';
      input.classList.add('failed-input');
      input.classList.remove('valid-input');
      if (errorBlock) errorBlock.style.display = 'block';
    }

    function clearError(input, errorBlock, fieldName) {
      errors[fieldName] = false;
      input.dataset.errorStatus = 'inactive';
      input.classList.remove('failed-input');
      input.classList.add('valid-input');
      if (errorBlock) errorBlock.style.display = 'none';
    }

    function validateInput(input) {
      const field = input.name;
      const val = input.value.trim();
      const errorDiv = form.querySelector(\`div[data-for-error='\${field}']\`);

      if (field === 'phone') {
        if (!iti || !iti.isValidNumber()) {
          showError(input, errorDiv, field);
        } else {
          clearError(input, errorDiv, field);
        }
      } else if (field === 'email') {
        if (!/^\\S+@\\S+\\.[A-Za-z]{2,}$/.test(val)) {
          showError(input, errorDiv, field);
        } else {
          clearError(input, errorDiv, field);
        }
      } else if (field === 'first_name' || field === 'last_name') {
        if (/\\d/.test(val) || val.length < 2) {
          showError(input, errorDiv, field);
        } else {
          clearError(input, errorDiv, field);
        }
      } else {
        if (val.length < 2) {
          showError(input, errorDiv, field);
        } else {
          clearError(input, errorDiv, field);
        }
      }

      checkFormValidity();
    }

    function checkFormValidity() {
      const allValid = Object.values(errors).every(v => v === false);
      if (submitBtn) submitBtn.disabled = !allValid;
    }

    form.querySelectorAll('input[name="first_name"], input[name="last_name"]').forEach(el => {
      el.addEventListener('input', () => {
        el.value = el.value.replace(/\\d/g, '');
      });
    });

    if (phoneInput) {
      phoneInput.addEventListener('input', () => {
        phoneInput.value = phoneInput.value.replace(/[^\\d+]/g, '');
      });
    }

    inputs.forEach(input => {
      input.addEventListener('input', () => validateInput(input));
      input.addEventListener('blur', () => validateInput(input));
    });

    if (phoneInput) {
      phoneInput.addEventListener('countrychange', () => validateInput(phoneInput));
    }

    form.addEventListener('submit', function (e) {
      let hasError = false;

      inputs.forEach(input => {
        validateInput(input);
        if (errors[input.name]) hasError = true;
      });

      if (hasError) {
        e.preventDefault();
        return false;
      }

      const loader = form.querySelector('.rf-form__loader');
      if (loader) loader.style.display = '';
    });

  });
});

// ----------- SCROLL TO FORM ----------- //
$("a").click(function(e) {
  e.preventDefault();
  const destination = $('#form').offset()?.top || 0;
  $("html, body").animate({ scrollTop: destination }, 800);
  return false;
});

// ----------- DUPLICATE EMAIL CHECK ----------- //
$(document).on("submit", 'form', function() {
  const email = $('input[type="email"]', this).val() || '';
  const form = this;

  document.querySelector('.rf-form__loader')?.style.display = '';

  const autoLoginUrl = getCookie('al');
  if (autoLoginUrl) {
    window.location = autoLoginUrl;
    return false;
  }

  if (getCookie('user_email_recent') === email) {
    showDuplicatePopup();
    disableSubmit(form);
    return false;
  }

  setCookie('user_email_recent', email, 3600);
});

function getCookie(name) {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

function setCookie(name, value, expireSeconds) {
  const expires = new Date(Date.now() + expireSeconds * 1000).toUTCString();
  document.cookie = \`\${name}=\${encodeURIComponent(value)}; expires=\${expires}; path=/\`;
}

function showDuplicatePopup() {
  const overlayHTML = '<div id="overlay" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:999;"></div>';
  $('body').append(overlayHTML);

  const popupHTML = \`
    <div id="duplicate-email-popup" style="position:fixed; left:50%; top:50%; transform:translate(-50%,-50%);
         z-index:1000; background:#fff; box-shadow:0 0 15px rgba(0,0,0,0.3); padding:25px; border-radius:10px;
         text-align:center; font-family: Arial, Helvetica, sans-serif; max-width:350px; width:100%; color:#333;">
      <p style="font-size:16px; margin-bottom:20px;">You have already left a request, please wait for the operator to call you.</p>
      <button onclick="closePopup()" style="background-color:#7ed321; color:#fff; border:none; padding:10px 20px; font-size:16px; cursor:pointer; border-radius:5px; transition: background-color 0.3s ease;">
        OK
      </button>
    </div>
  \`;
  $('body').append(popupHTML);
}

function disableSubmit(form) {
  const $btn = $(form).find('button[type="submit"], input[type="submit"]');
  $btn.attr('disabled', true)
      .attr('style', 'opacity: 0.6 !important; cursor: not-allowed !important;');
}

function closePopup() {
  $('#overlay').remove();
  $('#duplicate-email-popup').remove();

  document.querySelector('.rf-form__loader')?.style.display = 'none';
}
  `;
};

module.exports = { generateFormScriptsContentForTwoForms };