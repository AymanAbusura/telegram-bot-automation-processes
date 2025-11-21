<?php

$kt = '{{kt}}'; // КТ
$metka = '{{metka}}'; // метка
$country = '{{country}}'; // страна ISO
$lang = '{{lang}}'; // язык
$number_code = '{{number_code}}'; // number code, +123
$funnel = '{{funnel}}'; // название воронки
$source = '{{source}}'; // сайт или название воронки
$logs = {{logs}}; // 1 - на логи, 0 - сразу на партнерки
// $box = ''; // номер для бокс раскомментировать строку и строку 71
// $land_id = ''; // номер ленда раскомментировать строку и строку 72
// $partner_name = ''; // название ппшки здесь и нужно раскомментировать строку, раскомментировать 82 строку и закомментировать 10 и 81 строку

if (empty($_POST['full_phone'])) {
    header("Location: " . $_SERVER['HTTP_REFERER']);
    die;
}

if (isset($_COOKIE['al'])) {
    file_put_contents('lead_ytreerf.txt', 'DUPLICATE: ' . PHP_EOL . $_POST['email'] . PHP_EOL . $_COOKIE['al'] . PHP_EOL . date('Y-m-d H:i:s', time()) . PHP_EOL, FILE_APPEND);
    header("Location: " . $_COOKIE['al']);
    die;
}

/* Обновление данных клика */

$cl_name = $_POST['first_name'] . ' ' . $_POST['last_name'];
$cl_phone = str_replace(['+', '-', ')', '(', ' '], '', $_POST['full_phone']);
$cl_email = isset($_POST['email']) ? $_POST['email'] : '';
$cl_subid = $_POST['sub1'];

$cl_year = random_int(1953, 1993);
$cl_month = random_int(1, 12);
$cl_day = random_int(1, 28);
$cl_db = $cl_year . ($cl_month < 10 ? '0'.$cl_month : $cl_month) . ($cl_day < 10 ? '0'.$cl_day : $cl_day);

$cl_url = 'http://' . $_SERVER['SERVER_ADDR']
        . '?_update_tokens=1&sub_id=' . urlencode($cl_subid)
        . '&sub_id_14=' . urlencode($cl_name)
        . '&sub_id_15=' . urlencode($cl_phone)
        . '&sub_id_16=' . urlencode($cl_email)
        . '&sub_id_17=' . urlencode($cl_db)
        . '&sub_id_18=' . urlencode($_POST['pc'] . '%');

file_get_contents($cl_url);

/* Конец кода обновления данных клика */

// LeadHub

$curl = curl_init();

curl_setopt_array($curl, array(
  CURLOPT_URL => 'https://lh-landings.ru/lead/push',
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_ENCODING => '',
  CURLOPT_MAXREDIRS => 10,
  CURLOPT_TIMEOUT => 0,
  CURLOPT_FOLLOWLOCATION => true,
  CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
  CURLOPT_CUSTOMREQUEST => 'POST',
  CURLOPT_POSTFIELDS => json_encode([
    'lead_data' => [
      'first_name' => $_POST['first_name'],
      'last_name' => $_POST['last_name'],
      'phone' => $_POST['full_phone'],
      'email' => $_POST['email'],
      'prefix' => $number_code,
      'lang' => $lang,
      // 'box' => $box,
      // 'land_id' => $land_id,
    ],
    'funnel' => $funnel,
    'source' => $source,
    'ip' => isset($_POST['ip']) ? urldecode($_POST['ip']) : $_SERVER['REMOTE_ADDR'],
    'geo' => $country,
    'ua' => $_SERVER['HTTP_USER_AGENT'] ?? 'Mozilla/5.0',
    'subid' => $_POST['sub1'] ?? bin2hex(random_bytes(7)),
    'mark' => $metka,
    'partner' => $logs === 1 ? 'Logs' : null
    // 'partner' => $partner_name,
  ]),
  CURLOPT_HTTPHEADER => array(
    'Content-Type: application/json'
  ),
));

$response = json_decode(curl_exec($curl), true);

$_POST['curl_info'] = curl_getinfo($curl, CURLINFO_TOTAL_TIME) . ' | ' . curl_getinfo($curl, CURLINFO_HTTP_CODE);
$_POST['response'] = isset($response) ? json_encode($response) : '';
$_POST['from'] = $_SERVER['HTTP_REFERER'] ?? '';
$_POST['leadcreateAt'] = date('Y-m-d H:i:s', time());
file_put_contents('lead_forjm.txt', print_r($_POST, true), FILE_APPEND);

curl_close($curl);

if ($response['success']) {

    if (!empty($response['autologin'])) {
        setcookie('al', $response['autologin'], time()+140, '/');
    }

    // Выбрать кт, если льют на логи
    switch ($kt) {
        case '5':
            file_get_contents("http://5.187.2.78/9d73710/postback?subid={$_POST['sub1']}&status=lead&payout=0");
            break;
        case '45':
            file_get_contents("http://45.84.227.81/9220a2b/postback?subid={$_POST['sub1']}&status=lead&payout=0");
            break;
        case '62':
            file_get_contents("http://62.113.103.147/7ab43a9/postback?subid={$_POST['sub1']}&status=lead&payout=0");
            break;
        default:
            file_put_contents('error_log.txt', 'Invalid KT value: ' . $kt . PHP_EOL, FILE_APPEND);
            break;
    }

    header("Location: " . $response['autologin']); // Если серверный пиксель
    // $al = $response['autologin']; // Если обычный пиксель
}

include '../thankyou/index.php';

?>