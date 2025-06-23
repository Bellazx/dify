from flask import request, current_app
from flask_restx import Resource, Namespace
import json
from datetime import datetime

from .api import call_api
from app.config import Config

def call_basic_info(qry_str):
    payload = {
        "userCode": current_app.config["API_USERCODE"],
        "userPwd": current_app.config["API_PWD"],
        "qryType": 1,
        "qryStr": qry_str
    }

    # 调用第一个接口获取基本信息
    basic_info = call_api(
        current_app.config["API_URL"] + "/getAlephSysID.ashx",
        payload
    )

    # 验证接口响应
    if not basic_info or basic_info.get('resStr') != '1':
        print("获取基本信息失败" + basic_info.get('msgStr'))
        return None

    # 在第一个接口结果中查找匹配用户
    target_user = next(
        (user for user in basic_info.get('retUser', [])
         if str(user.get('cardno')) == str(qry_str)),
        None
    )

    if not target_user:
        print(f"未找到卡号为 {qry_str} 的用户基本信息")
        return None
    return target_user


def call_gate_info(qry_str):
    payload = {
        "userCode": current_app.config["API_USERCODE"],
        "userPwd": current_app.config["API_PWD"],
        "qryType": 1,
        "qryStr": qry_str
    }

    # 调用第二个接口获取门禁信息
    gate_info = call_api(
        current_app.config["API_URL"] + "/getGateInfo.ashx",
        payload
    )

    # 验证接口响应
    if not gate_info or gate_info.get('resStr') != '1':
        print("获取门禁信息失败" + gate_info.get('msgStr'))
        return None

    # 在门禁结果中查找匹配用户
    gate_user = next(
        (user for user in gate_info.get('retUser', [])
         if str(user.get('cardno')) == str(qry_str)),
        None
    )
    if not gate_user:
        print(f"未找到卡号为 {qry_str} 的用户门禁信息")
        return None
    return gate_user


def get_merged_user_info(qry_str):
    """获取并合并指定用户的完整信息"""
    target_user = call_basic_info(qry_str)
    gate_user = call_gate_info(qry_str)

    if gate_user is None and target_user is None:
        result = {
            'success': False,
            'message': '获取用户信息失败，未查询到有效信息'
        }
        return result

    if gate_user:
        if target_user is None:
            target_user = {
                'userName': gate_user.get('username'),
                'cardid': gate_user.get('cardid'),
                'cardno': gate_user.get('cardno'),
                'userState': '未知',
                'fee': '未知'
            }
        target_user['isNormal'] = '正常' if gate_user.get('isNormal') == 1 else '异常'
        if target_user['userState'] != '未知':
            target_user['userState'] = '正常' if target_user.get('userState', '-1') == '0' else '异常'
        target_user['gateInfo'] = {  # 添加部分门禁信息
            'dept': gate_user.get('dept'),
            'usertype': gate_user.get('usertype'),
        }
    else:
        target_user['isNormal'] = '未知'
        print("门禁信息获取失败，仅返回基本信息")

    # 构造最终返回结构
    user_info_res = {
        'success': True,
        'message': '查询成功',
        'data': target_user
    }
    result = format_user_info(user_info_res)
    return result


def can_book_seat(qry_str):
    """获取是否有预约座位权限"""
    gate_user = call_gate_info(qry_str)
    if gate_user:
        return {
        'success': True,
        'message': '查询成功',
        'data':{
            'can_book_seat': Config.can_book_seat(gate_user.get('usertype'))
        }
    }
    return {
            'success': False,
            'message': '获取用户信息失败，未查询到有效信息'
        }


def format_user_info(user_info_res):
    """格式化打印用户信息"""
    if not user_info_res or not user_info_res.get('success'):
        result = {
            'success': False,
            'message': '获取用户信息失败，未查询到有效信息'
        }
        return result

    user = user_info_res.get('data', {})
    user_type = user.get('gateInfo', {}).get('usertype', '未知').lower()

    # 身份类型中文映射
    type_mapping = {
        'faculty': '教职工',
        'student': '学生',
        'yxy': '医学院教职工',
        'fs': '附属单位职工',
        'vip': '贵宾',
        'postphd': '博士后',
        'external_teacher': '外聘教师',
        'summer': '暑期生',
        'team': '集体账号',
        'alumni/schoolfellow': '校友',
        'green': '绿色通道',
        'outside': '校外人员',
        'fszxjs': '附属中学教师',
        'freshman': '新生',
        'fwxz': '访问学者',
        'meeting': '会议账号',
        'studentother': '非正规学生',
        'xmdl': '项目代理'
    }

    # 转换日期格式函数
    def format_date(original_date):
        if not original_date or len(original_date) != 8:
            return "未知"
        try:
            year = original_date[:4]
            month = original_date[4:6].lstrip('0')
            day = original_date[6:8].lstrip('0')
            return f"{year}年{month}月{day}日"
        except:
            return original_date  # 转换失败返回原值

    def format_fee(fee_value):
        """格式化逾期费字段：去掉负号但保留0.00"""
        if not fee_value:
            return "0.00"

        # 处理字符串类型的费用
        if isinstance(fee_value, str):
            # 去掉可能的¥、$等货币符号
            cleaned = fee_value.strip().lstrip('¥$€')
            # 如果是负数则去掉负号
            if cleaned.startswith('-'):
                return cleaned[1:]
            return cleaned

        # 处理数字类型的费用
        if isinstance(fee_value, (int, float)):
            return str(abs(fee_value)) if fee_value < 0 else str(fee_value)

        return "0.00"  # 默认值

    # 转换有效期
    expire_date = format_date(user.get('userExpireDate', ''))
    address_expire_date = format_date(user.get('addressExpireDate', ''))
    # 转换逾期费
    fee = format_fee(user.get('fee', ''))

    lines = [
        "\n【用户信息汇总】",
        f"查询状态: {user_info_res.get('message', '未知')}",
        "-" * 50,
        f"姓名: {user.get('userName', '未知')}",
        f"学工号: {user.get('cardno', '未知')}",
        f"系统ID: {user.get('sysId', '未知')}",
        f"物理卡号: {user.get('cardid', '未知')}",
        f"NFC ID: {user.get('nfcId', '未知')}",
        f"邮箱: {user.get('userEmail', '未知')}",
        f"电话: {user.get('userTel', '未知')}",
        "-" * 50,
        "【权限状态】",
        f"门禁权限: {user.get('isNormal')}",
        f"借阅权限: {user.get('userState')}",
        "-" * 50,
        "【身份信息】",
        f"部门: {user.get('gateInfo', {}).get('dept', '未知')}",
        f"读者身份有效期: {expire_date}",
        f"读者通讯有效期: {address_expire_date}",
        f"身份类型: {type_mapping.get(user_type, user_type)}",
        f"逾期费: {fee}",
        "=" * 50
    ]
    print('\n'.join(lines))
    result = {
        'success': True,
        'message': '查询成功',
        'data': '\n'.join(lines)
    }
    return result


def format_datetime(date_str, time_str):
    """将日期和时间格式化为 yyyy年xx月xx日 x时x分"""
    if not date_str or not time_str:
        return ""

    try:
        date = datetime.strptime(date_str, "%Y%m%d")
        time = f"{time_str[:2]}:{time_str[2:]}" if len(time_str) == 4 else time_str
        return date.strftime("%Y年%m月%d日 ") + time.replace(":", "时") + "分"
    except:
        return ""


def call_borrow_book_list_api(user_id):
    payload = {
        "userCode": current_app.config["API_USERCODE"],
        "userPwd": "F3F8828238A7F0DDD445FE58BAF94AB3",
        "qryType": 1,
        "qryStr": user_id
    }
    # 调用第二个接口获取门禁信息
    borrow_info_res = call_api(
        current_app.config["API_URL"] + "/getBorrowBookListById.ashx",
        payload
    )
    print(borrow_info_res)
    # 验证接口响应
    if not borrow_info_res or borrow_info_res.get('resStr') != '1':
        print("获取借书列表失败" + borrow_info_res.get('msgStr'))
        return {
            'success': False,
            'message': "获取借书列表失败" + borrow_info_res.get('msgStr')
        }
    borrow_info = borrow_info_res.get('retBook')
    """转换原始JSON数据到API模型格式"""
    result = []
    overdue_count = 0
    for item in borrow_info:
        transformed = {
            'source': item.get('srcUnit', ''),
            'barcode': item.get('barcode', ''),
            'book_name': item.get('bookname', ''),
            'book_author': item.get('bookauthor', ''),
            'publish': item.get('publish', ''),
            'pub_year': item.get('pubYear', ''),
            'sub_library_code': item.get('sublibrary', ''),
            'collection_code': item.get('collection', ''),
            'borrow_time': format_datetime(item.get('borrowDate'), item.get('borrowHour')),
            'should_return_time': format_datetime(item.get('returnEndDate'), item.get('returnEndHour')),
            'call_no': item.get('callno', ''),
            'isbn': item.get('isbn', ''),
            'material': item.get('material', ''),
            'overdue': datetime.strptime(item.get('returnEndDate') + item.get('returnEndHour'), '%Y%m%d%H%M') < datetime.now()
        }
        if transformed['overdue']:
            overdue_count += 1
        result.append(transformed)
    return {
        'success': True,
        'message': '查询成功，当前用户在借书本（资源）共' + str(len(result)) + '本，其中逾期' + str(overdue_count) + '本',
        'data': result
    }


def init_user_api(api, models):
    ns = Namespace('/user', description='图书馆管理系统接口')

    @ns.route('/get_user_info')
    class UserInfo(Resource):
        @ns.doc('get_user_info')
        @ns.param('user_id', '用户学工号', required=True)
        @ns.response(200, '成功')
        @ns.response(400, '错误', models['error_model'])
        def get(self):
            """获取用户信息接口,通过用户学工号查询用户信息，包含姓名、学工号、系统ID、物理卡号、NFC ID、邮箱、电话、进馆权限、借阅权限、部门、身份有效期、通讯有效期、身份类型、逾期费等信息"""
            user_id = request.args.get('user_id')
            if not user_id:
                return {
                    "message": "user_id is required",
                    "success": False
                }, 400

            return get_merged_user_info(user_id)
 

    @ns.route('/get_user_borrow_info')
    class UserBorrowInfo(Resource):
        @ns.doc('get_user_borrow_info')
        @ns.param('user_id', '用户学工号', required=True)
        @ns.response(200, '成功', models['borrow_info_response'])
        @ns.response(400, '错误', models['error_model'])
        def get(self):
            """获取用户借阅信息,通过用户学工号获取在借所有资源的信息，根据overdue字段来判断是否过期/逾期"""
            user_id = request.args.get('user_id')
            if not user_id:
                return {
                    "message": "user_id is required",
                    "success": False
                }, 400

            return call_borrow_book_list_api(user_id)
            # if user_id == "user_1234567890":
            #     return {
            #         "data": {
            #             "borrow_info": [{
            #                 "book_id": "book_1234567890",
            #                 "book_name": "Book 1",
            #                 "borrow_time": "2024-01-01 12:00:00",
            #                 "borrow_end_time": "2025-01-01 12:00:00",
            #                 "borrow_status": "success",
            #                 "borrow_user_id": "user_1234567890",
            #             }, {
            #                 "book_id": "book_1234567891",
            #                 "book_name": "Book 2",
            #                 "borrow_time": "2024-01-01 12:00:00",
            #                 "borrow_end_time": "2026-01-01 12:00:00",
            #                 "borrow_status": "success",
            #                 "borrow_user_id": "user_1234567891",
            #             }]
            #         },
            #         "status": "success"
            #     }
            # else:
            #     return {
            #         "data": {
            #             "borrow_info": [{
            #                 "book_id": "book_1234567890",
            #                 "book_name": "Book 1",
            #                 "borrow_time": "2024-01-01 12:00:00",
            #                 "borrow_end_time": "2026-01-01 12:00:00",
            #                 "borrow_status": "success",
            #                 "borrow_user_id": "user_1234567890",
            #             }]
            #         },
            #         "status": "success"
            #     }

    @ns.route('/can_book_seat')
    class UserBorrowInfo(Resource):
        @ns.doc('can_book_seat')
        @ns.param('user_id', '用户学工号', required=True)
        @ns.response(200, '成功', models['reserve_check_response'])
        @ns.response(400, '错误', models['error_model'])
        def get(self):
            """获取用户能否预约（含全媒体）,通过用户学工号获取是否有预约（含全媒体）权限"""
            user_id = request.args.get('user_id')
            if not user_id:
                return {
                    "message": "user_id is required",
                    "success": False
                }, 400

            return can_book_seat(user_id)
    return ns


if __name__ == '__main__':
    # 示例查询卡号
    query_cardno = "61396"  # 可以修改为需要查询的卡号

    # 获取用户信息
    merged_info = get_merged_user_info(query_cardno)
    import pprint

    pprint.pprint(merged_info)
    result = call_borrow_book_list_api(query_cardno)
    pprint.pprint(result)
