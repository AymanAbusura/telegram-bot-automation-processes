function generateFormHTML(params) {
    const logsValue = params.logs && !isNaN(parseInt(params.logs)) ? parseInt(params.logs) : 0;
    
    return `
<!-- FORM -->

<link rel="stylesheet" type="text/css" href="form_1.css">
<style>
  form ul, .iti__arrow {
    display: none!important;
  }
</style>

<div class="form_main">
    <div id="reg-form">
        <div class="rf-container">
            <div class="rf-container__inner">
                <div class="f1t-form" id="form-f1t">
                    <form id="form" method="post" action="order.php" class="f1t-form__wrapper">

<input type="hidden" name="sub1" value="{subid}">
<input type="hidden" name="ip" value="{ip}">
<input type="hidden" name="pc" value="<?=$_GET['scroll'];?>">
                        
                        <div class="rf-form__loader js-rf-loader" style="display: none;"></div>
                        <div class="f1t-form__inner">
                            <div class="f1t-form__row">
                                <div class="f1t-form-field">
                                  <label>
                                    <input required type="text" placeholder="First Name" name="first_name" data-validation-status="inactive">
                                    <div data-error-status="inactive" data-for-error="first_name" class="input_error">Your first name is too short (at least 2 characters)</div>
                                  </label>
                                </div>
                            </div>
                            <div class="f1t-form__row">
                                <div class="f1t-form-field">
                                  <label>
                                    <input required type="text" placeholder="Last Name" name="last_name" data-validation-status="inactive">
                                    <div data-error-status="inactive" data-for-error="last_name" class="input_error">Your last name is too short (at least 2 characters)</div>
                                  </label>
                                </div>
                            </div>
                            <div class="f1t-form__row">
                                <div class="f1t-form-field">
                                  <label>
                                    <input required type="email" placeholder="Email" name="email" data-validation-status="inactive">
                                    <div data-error-status="inactive" data-for-error="email" class="input_error">Please enter your real email address (example@email.com)</div>
                                  </label>
                                </div>
                            </div>
                            <div class="f1t-form__row">
                                <div class="f1t-form-field f1t-form-field--phone">
                                  <label>
                                      <input required id="phone" class="f1t-form-field__input" type="tel" placeholder="Your mobile phone" name="phone" autocomplete="off" data-intl-tel-input-id="0" data-counter="0" style="padding-left: 104px;" data-validation-status="inactive">
                                      <div data-error-status="inactive" data-for-error="phone" class="input_error">Please enter a valid phone number</div>
                                  </label>
                                </div>
                            </div>
                        </div>
                        <div class="f1t-form__footer">
                            <button class="f1t-form__submit" type="submit">Submit</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- END -->
`.trim();
}

module.exports = { generateFormHTML };