const generateFormScriptsContent = (countryCode) => {
  const safeCountryCode = countryCode.toUpperCase();
  return `
$(document).ready(function() {
  const itiInstances = [];

  // ----------- PHONE INITIALIZATION FOR ALL FORMS ----------- //
  $('input[name="phone"], input[id="phone"]').each(function() {
    const inputPhone = this;

    const iti = window.intlTelInput(inputPhone, {
      separateDialCode: true,
      initialCountry: "${safeCountryCode}",
      autoPlaceholder: "aggressive",
      hiddenInput: 'full_phone',
      onlyCountries: ["${safeCountryCode}"],
      utilsScript: "utils.js"
    });

    itiInstances.push({ input: inputPhone, iti });

    $(inputPhone).on('countrychange', function() {
      const prefixInput = $(this).closest('form').find('#prefix');
      if (prefixInput.length) {
        prefixInput.val($('.iti__selected-dial-code', this.parentNode)[0].innerText);
      }
    });

    $(inputPhone).on('input', function() {
      this.value = this.value.replace(/\D/g, '');
    });
  });

  $('input[name="first_name"], input[name="last_name"]').on('input', function() {
    this.value = this.value.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ'-]/g, '');
  });

  // ----------- FORM VALIDATION ----------- //
  $('form').each(function() {
    const form = this;
    const inputs = form.querySelectorAll('input[data-validation-status]');
    const errors = {};
    const submitBtn = $(form).find('button[type="submit"], input[type="submit"]');

    inputs.forEach(input => errors[input.getAttribute('name')] = true);
    submitBtn.prop('disabled', true);

    function showError(input, errorDiv, fieldName) {
      errors[fieldName] = true;
      input.setAttribute('data-error-status', 'active');
      input.classList.add('failed-input');
      input.classList.remove('valid-input');
      if (errorDiv) errorDiv.style.display = 'block';
    }

    function clearError(input, errorDiv, fieldName) {
      errors[fieldName] = false;
      input.setAttribute('data-error-status', 'inactive');
      input.classList.remove('failed-input');
      input.classList.add('valid-input');
      if (errorDiv) errorDiv.style.display = 'none';
    }

    function validateInput(input) {
      const fieldName = input.getAttribute('name');
      const value = input.value.trim();
      const errorDiv = form.querySelector(\`div[data-for-error='\${fieldName}']\`);

      if (fieldName === 'phone' || fieldName === 'phone_visible') {
        const itiObj = itiInstances.find(obj => obj.input === input);
        if (!itiObj || !itiObj.iti.isValidNumber()) {
          showError(input, errorDiv, fieldName);
        } else {
          clearError(input, errorDiv, fieldName);
        }
      }
      else if (fieldName === 'email') {
        if (!/^\\S+@\\S+\\.[A-Za-z]{2,}$/.test(value)) {
          showError(input, errorDiv, fieldName);
        } else {
          clearError(input, errorDiv, fieldName);
        }
      }
      else if (fieldName === 'first_name' || fieldName === 'last_name') {
        if (/\\d/.test(value) || value.length < 2) {
          showError(input, errorDiv, fieldName);
        } else {
          clearError(input, errorDiv, fieldName);
        }
      }
      else {
        if (value.length < 2) {
          showError(input, errorDiv, fieldName);
        } else {
          clearError(input, errorDiv, fieldName);
        }
      }

      const allValid = Object.values(errors).every(v => v === false);
      submitBtn.prop('disabled', !allValid);
    }

    inputs.forEach(input => {
      input.addEventListener('input', () => validateInput(input));
      input.addEventListener('blur', () => validateInput(input));
    });

    form.addEventListener('submit', function(e) {
      let hasError = false;
      inputs.forEach(input => {
        validateInput(input);
        if (errors[input.getAttribute('name')]) hasError = true;
      });
      if (hasError) {
        e.preventDefault();
        return false;
      }
      const loader = form.querySelector('.rf-form__loader');
      if (loader) loader.style.display = '';
    });
  });

  // ----------- SCROLL TO FORM ----------- //
  $("a, .goToForm").click(function(e) {
    e.preventDefault();
    const destination = $('#form').offset().top;
    $("html, body").animate({scrollTop: destination}, 800);
    return false;
  });

  // ----------- DUPLICATE EMAIL CHECK ----------- //
  $(document).on("submit", 'form', function() {
    const email = $('input[type="email"]', this).val() || '';
    const form = this;

    $(form).find('.rf-form__loader').show();

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
    const overlayHTML = \`<div id="overlay" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:999;"></div>\`;
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

  window.closePopup = function() {
    $('#overlay').remove();
    $('#duplicate-email-popup').remove();
    $('.rf-form__loader').hide();
  };
});
`;
};

module.exports = { generateFormScriptsContent };