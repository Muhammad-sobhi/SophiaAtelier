<?php

namespace Database\Seeders;

use App\Models\WhatsappTemplate;
use Illuminate\Database\Seeder;

class WhatsappTemplateSeeder extends Seeder
{
    public function run(): void
    {
        $templates = [
            [
                'key' => 'visit_confirmation',
                'title' => 'تأكيد موعد التجربة',
                'body' => "✨ *فساتين صوفيا | Sophia Dresses* ✨\n\nمرحباً يا جميلتنا *{{client_name}}* 🤍،\nيسعدنا جداً تأكيد موعدكِ معنا لتجربة فستان أحلامكِ!\n\n📅 *تفاصيل الموعد:*\n• *التاريخ:* {{visit_date}}\n• *الوقت:* {{visit_time}}\n\n🌸 *شروط وقواعد فساتين صوفيا:*\n( مسموح ب دخول فردين فقط مع العروسه ladies only )\n(الدخول ب أولوية الحضور)\n• *رسوم التجربة والقياس:* {{trying_fee}}\n\nAddress ⤵️\nالتجمع الاول الياسمين ٢ \nفيلا 161 الباب الجانبي للفيلا بيكون شمال باب الفيلا (basement) \n⬅️اليافطه السودا161\n\nLocation📍\nhttps://maps.app.goo.gl/RUyaQk3v1rZR4gVC6\n\nنحن بانتظار تشريفكِ لتنيري المكان ✨🎀",
                'placeholders' => ['client_name', 'visit_date', 'visit_time', 'trying_fee']
            ],
            [
                'key' => 'booking_confirmation',
                'title' => 'تأكيد الحجز',
                'body' => "✨ *فساتين صوفيا | Sophia Dresses* ✨\n\nمرحباً يا جميلتنا *{{client_name}}* 🤍،\nيسعدنا جداً تأكيد حجز موعدكِ وتجهيز فستان أحلامكِ!\n\n📅 *تفاصيل الموعد:*\n• *التاريخ:* {{visit_date}}\n• *الوقت:* {{visit_time}}\n{{dress_line}}\n\n🌸 *شروط وقواعد فساتين صوفيا:*\n( مسموح ب دخول فردين فقط مع العروسه ladies only )\n(الدخول ب أولوية الحضور)\n\nAddress ⤵️\nالتجمع الاول الياسمين ٢ \nفيلا 161 الباب الجانبي للفيلا بيكون شمال باب الفيلا (basement) \n⬅️اليافطه السودا161\n\nLocation📍\nhttps://maps.app.goo.gl/RUyaQk3v1rZR4gVC6\n\nنحن بانتظار تشريفكِ لتنيري المكان ✨🎀",
                'placeholders' => ['client_name', 'visit_date', 'visit_time', 'dress_line']
            ],
            [
                'key' => 'pickup_reminder',
                'title' => 'تذكير بموعد الاستلام',
                'body' => "✨ *فساتين صوفيا | Sophia Dresses* ✨\n\nمرحباً يا جميلتنا *{{client_name}}* 🤍،\nنود تذكيركِ بموعد استلام فستان زفافكِ 👗\n\n📅 *تفاصيل الاستلام:*\n• *تاريخ الزفاف:* {{wedding_date}}\n• *تاريخ الاستلام المقترح:* {{pickup_date}} (خلال أوقات العمل من ١:٠٠ م إلى ٨:٣٠ م)\n\n🌸 *شروط وقواعد فساتين صوفيا:*\n( مسموح ب دخول فردين فقط مع العروسه ladies only )\n(الدخول ب أولوية الحضور)\n\nAddress ⤵️\nالتجمع الاول الياسمين ٢ \nفيلا 161 الباب الجانبي للفيلا بيكون شمال باب الفيلا (basement) \n⬅️اليافطه السودا161\n\nLocation📍\nhttps://maps.app.goo.gl/RUyaQk3v1rZR4gVC6\n\nيسعدنا تشريفكِ لتستلمي فستان أحلامكِ ✨🎀",
                'placeholders' => ['client_name', 'wedding_date', 'pickup_date']
            ],
            [
                'key' => 'wedding_congratulations',
                'title' => 'تهنئة بالزفاف',
                'body' => "✨ *فساتين صوفيا | Sophia Dresses* ✨\n\nألف مبروك لجميلتنا الرائعة *{{client_name}}* 🤍👰🏻‍♀️،\nنتمنى لكِ حياة زوجية سعيدة ومليئة بالحب والفرح! سعدنا جداً بكوننا جزءاً من يومكِ المميز وتألقكِ بفستان أحلامكِ المختار من فساتين صوفيا 👗💖✨",
                'placeholders' => ['client_name']
            ],
            [
                'key' => 'payment_reminder',
                'title' => 'تذكير بالسداد',
                'body' => "✨ *فساتين صوفيا | Sophia Dresses* ✨\n\nمرحباً يا جميلتنا *{{client_name}}* 🤍،\nنود تذكيركِ بالدفع المتبقي لحساب فستان زفافكِ.\n\n📊 *تفاصيل الحساب:*\n• *المبلغ المدفوع:* {{paid_amount}}\n• *المبلغ الإجمالي:* {{total_amount}}\n• *المتبقي:* {{remaining}}\n\nنود تذكيركِ بالمبلغ المتبقي لحجز فستان زفافكِ. يسعدنا تشريفكِ لإتمام السداد وتأكيد تفاصيل الاستلام ✨🎀",
                'placeholders' => ['client_name', 'paid_amount', 'total_amount', 'remaining']
            ]
        ];

        foreach ($templates as $t) {
            WhatsappTemplate::updateOrCreate(['key' => $t['key']], $t);
        }
    }
}
